import { PDFDocument, StandardFonts, rgb } from "./vendor/pdf-lib.mjs";
import { SYSTEM, PATH, SCALE, ATTRIBUTES, SKILLS, CLASSES, ORIGINS, MOONS, rankLimit } from "./rules.mjs";
import { attributeFor } from "./actions.mjs";
import { equipmentSlots, SLOT_LABELS } from "./equipment.mjs";
import { MOON_BLESSINGS } from "./moon-blessings.mjs";

const plain = value => {
  const doc = new DOMParser().parseFromString(String(value ?? ""), "text/html");
  doc.querySelectorAll("script,style,template").forEach(n=>n.remove());
  doc.querySelectorAll("p,div,li,br").forEach(n=>n.append("\n"));
  return doc.body.textContent.trim();
};
const pool = p => `${p?.value ?? 0} / ${p?.max ?? 0}`;
const color = (r,g,b) => rgb(r/255,g/255,b/255);
const ink=color(45,40,34), muted=color(100,94,85), border=color(191,184,171), pale=color(245,242,235);

export async function buildCharacterPDF(actor, sky=[], logoBytes=null) {
  const s=actor.system, klass=CLASSES[s.classe], items=[...actor.items].sort((a,b)=>a.sort-b.sort);
  const by=type=>items.filter(i=>i.type===type);
  const doc=await PDFDocument.create(); doc.setTitle(`${actor.name} - Lunatar RPG`);
  const regular=await doc.embedFont(StandardFonts.Helvetica), bold=await doc.embedFont(StandardFonts.HelveticaBold), serif=await doc.embedFont(StandardFonts.TimesRomanBold);
  const W=595.28,H=841.89,M=34,CW=W-2*M, bottom=45;
  let page,y;
  // Standard PDF fonts cover Portuguese; unsupported glyphs are substituted individually.
  const safe=(value,font=regular)=>Array.from(String(value??"—").normalize("NFC")).map(ch=>{if(ch==="\n")return ch;if(/[\r\t]/.test(ch))return " ";try{font.encodeText(ch);return ch;}catch{return "?";}}).join("");
  const wrap=(value,width,size,font=regular)=>{
    const lines=[]; for(const para of safe(value,font).split("\n")){
      let line=""; for(const word of para.split(/ +/)){
        const candidate=line?`${line} ${word}`:word;
        if(font.widthOfTextAtSize(candidate,size)<=width){line=candidate;continue;}
        if(line){lines.push(line);line="";}
        for(const ch of word){if(line&&font.widthOfTextAtSize(line+ch,size)>width){lines.push(line);line="";}line+=ch;}
      } lines.push(line);
    } return lines.length?lines:[""];
  };
  const draw=(value,x,top,size=9,font=regular,c=ink)=>page.drawText(safe(value,font).replace(/\n/g," "),{x,y:H-top-size,size,font,color:c});
  const rect=(x,top,w,h,fill)=>page.drawRectangle({x,y:H-top-h,width:w,height:h,borderColor:border,borderWidth:.55,...(fill?{color:fill}:{})});
  const rule=top=>page.drawLine({start:{x:M,y:H-top},end:{x:W-M,y:H-top},thickness:.6,color:border});
  const newPage=()=>{page=doc.addPage([W,H]);y=M;};
  const ensure=h=>{if(y+h>H-bottom)newPage();};
  const title=label=>{ensure(42);draw(label,M,y,15,serif);y+=21;rule(y);y+=7;};
  const textBlock=(label,value)=>{
    const lines=wrap(value,CW-16,9);ensure(40);for(const l of wrap(label,CW-8,10,bold)){ensure(15);draw(l,M+3,y,10,bold);y+=15;}
    for(const line of lines){ensure(13);draw(line,M+8,y,9);y+=12;}y+=5;
  };
  const cards=(pairs,cols=5)=>{
    const gap=5,w=(CW-gap*(cols-1))/cols;
    for(let i=0;i<pairs.length;i+=cols){const row=pairs.slice(i,i+cols), wrapped=row.map(([label,val])=>[wrap(label,w-10,7.5,bold),wrap(val,w-10,12,serif)]);const h=Math.max(43,...wrapped.map(([a,b])=>10+a.length*9+b.length*14));ensure(h+5);
      wrapped.forEach(([labels,values],j)=>{const x=M+j*(w+gap);rect(x,y,w,h,pale);let yy=y+5;for(const l of labels){draw(l,x+5,yy,7.5,bold,muted);yy+=9;}for(const v of values){draw(v,x+5,yy+2,12,serif);yy+=14;}});y+=h+5;}
  };
  const table=(headers,widths,rows)=>{
    const widthsPt=widths.map(v=>v*CW);const drawRow=(cells,isHead=false)=>{
      const font=isHead?bold:regular,size=isHead?7.5:8.5;
      const chunks=cells.map((v,i)=>wrap(v,widthsPt[i]-8,size,font));let index=0;
      const count=Math.max(...chunks.map(v=>v.length));
      while(index<count){if(y+20>H-bottom){newPage();if(!isHead)drawRow(headers,true);}
        const capacity=Math.max(1,Math.floor((H-bottom-y-8)/11));const take=Math.min(count-index,capacity),h=take*11+8;let x=M;
        chunks.forEach((lines,i)=>{rect(x,y,widthsPt[i],h,isHead?pale:null);for(let j=0;j<take;j++)if(lines[index+j]!==undefined)draw(lines[index+j],x+4,y+4+j*11,size,font);x+=widthsPt[i];});y+=h;index+=take;
      }
    }; ensure(42);drawRow(headers,true);for(const row of rows.length?rows:[headers.map((_,i)=>i===0?"—":"")])drawRow(row);y+=8;
  };
  newPage();
  if(logoBytes){try{const logo=await doc.embedPng(logoBytes);const dims=logo.scaleToFit(100,54);page.drawImage(logo,{x:W-M-dims.width,y:H-y-dims.height,width:dims.width,height:dims.height});}catch{/* Logo is optional; character data still exports. */}}
  draw("LUNATAR RPG",M,y,10,bold,muted);y+=15;
  for(const line of wrap(actor.name,CW-115,20,serif)){draw(line,M,y,20,serif);y+=23;}
  y=Math.max(y,91);cards([["Origem",ORIGINS[s.origem]?.[0]],["Classe",[klass?.label,s.nivel>=5?klass?.paths?.[s.trilha]?.[0]:null].filter(Boolean).join(" / ")],["Nível",s.nivel]],3);
  title("Estado do personagem");cards([["Saúde",pool(s.saude)],["Meia vida",Math.floor(s.saude.max/2)],["Magia",pool(s.magia)],["Ações",pool(s.acoes)],["Movimento",`${s.movimento} m`],["Defesa",s.defesa],["Defesa mágica",s.defesaMagica],["Proteção",s.protecao],["Impulsos",s.impulsos],["Recuo",s.recuo]]);
  cards([["Signo lunar",MOONS[s.lua-1]],["Dados lunares",s.dadoLunar],["Luas no céu",sky.map(i=>MOONS[i-1]).filter(Boolean).join(", ")||"—"]],3);
  title("Características");cards(Object.entries(ATTRIBUTES).map(([key,label])=>[label,s.caracteristicas?.[key]]),4);
  title("Aptidões");const skills=Object.entries(SKILLS).sort((a,b)=>a[1][0].localeCompare(b[1][0],"pt-BR"));
  const skillRow=([key,[label]])=>[`${label} (${ATTRIBUTES[attributeFor(actor,key)]??"—"})`,`d${SCALE[Math.min(s.aptidoes?.[key]??0,rankLimit(s.nivel))]}`,s.maestrias?.[key]||"—"];
  const mid=Math.ceil(skills.length/2);table(["Aptidão","Dado","Maestria","Aptidão","Dado","Maestria"],[.23,.07,.20,.23,.07,.20],skills.slice(0,mid).map((entry,i)=>[...skillRow(entry),...(skills[mid+i]?skillRow(skills[mid+i]):["","",""])]));
  title("Equipamento em uso");cards(Object.entries(equipmentSlots(actor)).map(([slot,id])=>[SLOT_LABELS[slot],items.find(i=>i.id===id)?.name||"—"]),3);
  title("Armas");table(["Arma","Aptidão","Dano","Mãos","Propriedades"],[.25,.19,.12,.17,.27],by("arma").map(i=>[i.name,SKILLS[i.system.aptidao]?.[0],i.system.dano,i.system.duasMaos?"Duas mãos":"Uma mão",i.system.propriedades]));
  title("Armaduras e escudos");table(["Nome","Defesa","Proteção","Fardos"],[.52,.16,.16,.16],by("armadura").map(i=>[i.name,i.system.defesa,i.system.protecao,i.system.fardos]));
  title("Formulações");for(const i of by("formulacao")){const f=i.system;textBlock(i.name,[[f.forma,f.palavra,f.palavraExtra].filter(Boolean).join(" / "),f.ampliacao,`${Number(f.custoForma||0)+Number(f.custoPalavra||0)+Number(f.custoExtra||0)} PM · ${f.custoAcao} ação(ões)`,f.dano,f.alcance,f.alvos,f.duracao,plain(f.descricao)].filter(Boolean).join(" · "));}if(!by("formulacao").length)textBlock("—","");
  for(const [type,label] of [["proeza","Proezas"],["traco","Traços"]]){title(label);for(const i of by(type))textBlock(i.name,[i.system.tipoAcao,i.system.custoAcao?`${i.system.custoAcao} ação(ões)`:null,i.system.maxUsos?`Usos ${i.system.usos}/${i.system.maxUsos}`:null,plain(i.system.descricao)].filter(Boolean).join(" · "));if(!by(type).length)textBlock("—","");}
  title("Bênçãos lunares");for(const [name,desc] of MOON_BLESSINGS[s.lua-1]??[])textBlock(name,desc);
  title("Inventário");table(["Item","Quantidade","Descrição"],[.30,.15,.55],by("equipamento").map(i=>[i.name,i.system.quantidade,plain(i.system.descricao)]));cards([['Solares',s.moedas?.solares],['Lunares',s.moedas?.lunares],['Estelares',s.moedas?.estelares]],3);
  title("Anotações");textBlock("História",plain(s.notas));textBlock("Marcas e condições",[plain(s.marcas),...[...actor.statuses].map(id=>CONFIG.statusEffects.find(e=>e.id===id)?.name??id)].filter(Boolean).join(" · "));textBlock("Desafios superados",String(s.desafios??0));
  const pages=doc.getPages();pages.forEach((p,i)=>{p.drawLine({start:{x:M,y:34},end:{x:W-M,y:34},color:border,thickness:.5});p.drawText("Lunatar RPG - Ficha não oficial - Colucci / New Order Editora",{x:M,y:22,font:regular,size:7,color:muted});p.drawText(`${i+1} / ${pages.length}`,{x:W-M-28,y:22,font:regular,size:7,color:muted});});
  return doc.save();
}

const EXPORT_FOLDER = "exportação-fichas";
export function exportFilename(name, now = new Date(), suffix = "") {
  const safe = String(name).normalize("NFKD").replace(/\p{M}/gu, "").replace(/[^a-zA-Z0-9_-]+/g,"-").replace(/^-+|-+$/g, "").slice(0,80) || "Personagem";
  return `${safe}-Lunatar-${now.toISOString().replace(/[:.]/g,"-")}${suffix ? `-${suffix}` : ""}.pdf`;
}

export async function archivePDF(file, picker = foundry.applications.apps.FilePicker.implementation) {
  const storage = `${PATH}/storage`;
  const destination = `${storage}/${EXPORT_FOLDER}`;
  // Create missing folders; do not replace existing files or require elevated permissions.
  for (const directory of [storage, destination]) {
    let exists = false;
    try { const result = await picker.browse("data",directory); exists = decodeURI(result.target ?? "").replace(/\/$/, "") === directory; } catch { /* create below */ }
    if (!exists) {
      try { await picker.createDirectory("data",directory); }
      catch (error) { const result = await picker.browse("data",directory); if (decodeURI(result.target ?? "").replace(/\/$/, "") !== directory) throw error; }
    }
  }
  const response = await picker.uploadPersistent(SYSTEM,EXPORT_FOLDER,file,{}, {notify:false});
  if (!response?.path || response.error) throw new Error(response?.error || "O Foundry não confirmou o salvamento da ficha.");
  const raw = String(response.path);
  const url = new URL(/^(https?:\/\/|\/)/i.test(raw) ? raw : foundry.utils.getRoute(raw),document.baseURI);
  if (url.origin !== location.origin || !decodeURI(url.pathname).includes(`/${destination}/`)) throw new Error("O Foundry retornou um caminho inesperado para a ficha.");
  return { path: `${destination}/${file.name}`, url: url.href };
}

function downloadFile(url, filename) {
  const link=document.createElement("a");link.href=url;link.download=filename;link.target="_self";
  document.body.append(link);link.click();link.remove();
}

export async function exportCharacterPDF(actor) {
  if(actor.type!=="personagem"||!actor.isOwner)return;
  let logo=null;try{const response=await fetch(new URL(`${PATH}/assets/logo.png`,document.baseURI));if(response.ok)logo=await response.arrayBuffer();}catch{/* optional logo */}
  const bytes=await buildCharacterPDF(actor,game.settings.get(SYSTEM,"luas"),logo);
  const name=exportFilename(actor.name,new Date(),foundry.utils.randomID(6));
  const file=new File([bytes],name,{type:"application/pdf"});
  let saved;
  try { saved=await archivePDF(file); }
  catch(error) {
    console.warn("Lunatar | Não foi possível arquivar PDF",error);
    if (/Electron/i.test(navigator.userAgent)) {
      ui.notifications.error("Não foi possível salvar a cópia no sistema. Verifique a permissão de envio de arquivos ou use o navegador para baixar o PDF.");
      return;
    }
    const url=URL.createObjectURL(file);downloadFile(url,name);setTimeout(()=>URL.revokeObjectURL(url),60000);
    ui.notifications.warn("Download solicitado. A cópia no sistema não foi salva; verifique a permissão de envio de arquivos.");
    return;
  }
  downloadFile(saved.url,name);
  ui.notifications.info(`Cópia salva em ${saved.path}. Download solicitado.`);
}
