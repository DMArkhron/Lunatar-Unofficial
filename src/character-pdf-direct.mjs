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
const pool = p => ({ write: true, max: p?.max ?? 0 });
// Match the characteristic used by the actual magic damage roll.
export function displayDamage(actor, formula) {
  const value = Number(actor.system.caracteristicas?.[attributeFor(actor, "ataqueMagico")] ?? 0);
  return String(formula ?? "").replace(/@formula(?:ç|c)(?:ã|a)o(?![\p{L}\p{N}_])/giu, String(Number.isFinite(value) ? value : 0));
}
const color = (r,g,b) => rgb(r/255,g/255,b/255);
const ink=color(45,40,34), muted=color(100,94,85), border=color(201,185,158), pale=color(246,241,229), cream=color(255,253,248), gold=color(146,117,72), purple=color(106,82,125);

export async function buildCharacterPDF(actor, sky=[], logoBytes=null, artwork={}, fonts=null) {
  const s=actor.system, klass=CLASSES[s.classe], items=[...actor.items].sort((a,b)=>a.sort-b.sort);
  const by=type=>items.filter(i=>i.type===type);
  const doc=await PDFDocument.create(); doc.setTitle(`${actor.name} - Lunatar RPG`);
  if(fonts?.kit)doc.registerFontkit(fonts.kit);
  const regular=await doc.embedFont(fonts?.regular??StandardFonts.Helvetica), bold=await doc.embedFont(fonts?.bold??StandardFonts.HelveticaBold), serif=await doc.embedFont(fonts?.serif??StandardFonts.TimesRomanBold);
  const W=595.28,H=841.89,M=34,CW=W-2*M, bottom=35;
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
  const rounded=(x,top,w,h,fill=cream,r=5,edge=border)=>page.drawSvgPath(`M${r} 0 H${w-r} Q${w} 0 ${w} ${r} V${h-r} Q${w} ${h} ${w-r} ${h} H${r} Q0 ${h} 0 ${h-r} V${r} Q0 0 ${r} 0 Z`,{x,y:H-top,color:fill,borderColor:edge,borderWidth:.65});
  const center=(value,x,top,w,size=9,font=regular,c=ink)=>{const v=safe(value,font).replace(/\n/g," ");draw(v,x+Math.max(0,(w-font.widthOfTextAtSize(v,size))/2),top,size,font,c);};
  const fitted=(value,x,top,w,size,font=bold,c=ink)=>{const v=safe(value,font).replace(/\n/g," ");draw(v,x,top,Math.min(size,w/Math.max(1,font.widthOfTextAtSize(v,1))),font,c);};
  const embedded={};for(const [key,bytes] of Object.entries(artwork)){try{embedded[key]=await doc.embedPng(bytes);}catch{/* optional art */}}
  const image=(key,x,top,w,h)=>{const img=embedded[key];if(!img)return;const d=img.scaleToFit(w,h);page.drawImage(img,{x:x+(w-d.width)/2,y:H-top-(h+d.height)/2,width:d.width,height:d.height});};
  const panel=(label,top,h)=>{rounded(M,top,CW,h,pale,6);draw(label,M+7,top+6,14,serif);page.drawLine({start:{x:M+7,y:H-top-24},end:{x:W-M-7,y:H-top-24},color:border,thickness:.6});};
  const mini=(x,top,w,h,label,value,tone=null)=>{rounded(x,top,w,h,cream,4);if(tone)page.drawRectangle({x:x+4,y:H-top-2,width:w-8,height:2,color:tone});center(label,x,top+5,w,7,bold,muted);if(value?.write){const lineY=H-top-28;if(value.max!==undefined){const suffix=`/ ${value.max}`,sw=serif.widthOfTextAtSize(suffix,13),lineWidth=Math.min(35,w-sw-14),start=x+(w-lineWidth-sw-6)/2;page.drawLine({start:{x:start,y:lineY},end:{x:start+lineWidth,y:lineY},color:border,thickness:.7});draw(suffix,start+lineWidth+6,top+15,13,serif);}else{page.drawLine({start:{x:x+w*.24,y:lineY},end:{x:x+w*.76,y:lineY},color:border,thickness:.7});}return;}const v=safe(value,serif);center(v,x,top+15,w,Math.min(13,(w-8)/Math.max(1,serif.widthOfTextAtSize(v,1))),serif);};
  const rule=top=>page.drawLine({start:{x:M,y:H-top},end:{x:W-M,y:H-top},thickness:.6,color:border});
  const newPage=()=>{page=doc.addPage([W,H]);y=M;};
  const ensure=h=>{if(y+h>H-bottom)newPage();};
  const themes={"Formulações":{tone:color(92,69,137),fill:color(237,231,247),card:color(250,247,253)},"Proezas":{tone:color(145,66,62),fill:color(245,228,224),card:color(253,248,246)},"Traços":{tone:color(46,105,83),fill:color(225,239,230),card:color(246,251,247)},"Bênçãos lunares":{tone:color(132,94,36),fill:color(248,237,207),card:color(255,251,240)}};
  let activeTheme=null,activeLabel="";
  const heading=(label,theme)=>{rounded(M,y,CW,theme?27:21,theme?.fill??pale,5,theme?.tone??border);if(theme)page.drawRectangle({x:M+1,y:H-y-24,width:4,height:21,color:theme.tone});draw(label,M+11,y+(theme?6:3),theme?14:13,serif,theme?.tone??purple);y+=theme?35:25;};
  const title=label=>{activeTheme=themes[label]??null;activeLabel=label;if(activeTheme&&y>M)y+=13;ensure(activeTheme?86:label==="Anotações"?75:35);heading(label,activeTheme);};
  const textBlock=(label,value)=>{
    const theme=activeTheme,tone=theme?.tone??purple,fill=theme?.card??cream;
    const labels=wrap(label,CW-26,10,bold),lines=wrap(value,CW-26,9.5),len=labels.length*14+lines.length*13+18;
    const minimum=14+13+18;
    const continuation=()=>{newPage();if(activeLabel)heading(`${activeLabel} (continuação)`,theme);};
    if(y+Math.min(len,H-bottom-M-(theme?35:0))>H-bottom&&y>M+(theme?35:0))continuation();
    let entries=[...labels.map(v=>({v,font:bold,size:10,c:tone,h:14})),...lines.map(v=>({v,font:regular,size:9.5,c:ink,h:13}))];
    while(entries.length){if(y+minimum>H-bottom)continuation();let available=H-bottom-y-18,count=0,used=0;while(count<entries.length&&used+entries[count].h<=available){used+=entries[count].h;count++;}if(!count){continuation();continue;}const h=used+18;rounded(M,y,CW,h,fill,5,theme?.tone??border);if(theme)page.drawRectangle({x:M+1,y:H-y-h+4,width:3,height:h-8,color:tone});let top=y+9;for(const e of entries.splice(0,count)){draw(e.v,M+13,top,e.size,e.font,e.c);top+=e.h;}y+=h+8;if(entries.length)continuation();}
  };
  const cards=(pairs,cols=5)=>{
    const gap=5,w=(CW-gap*(cols-1))/cols;
    for(let i=0;i<pairs.length;i+=cols){const row=pairs.slice(i,i+cols), wrapped=row.map(([label,val])=>[wrap(label,w-10,7.5,bold),wrap(val,w-10,12,serif)]);const h=Math.max(43,...wrapped.map(([a,b])=>10+a.length*9+b.length*14));ensure(h+5);
      wrapped.forEach(([labels,values],j)=>{const x=M+j*(w+gap);rounded(x,y,w,h,cream,4);let yy=y+5;for(const l of labels){center(l,x,yy,w,7.5,bold,muted);yy+=9;}for(const v of values){center(v,x,yy+2,w,12,serif);yy+=14;}});y+=h+5;}
  };
  const table=(headers,widths,rows)=>{
    const widthsPt=widths.map(v=>v*CW);const drawRow=(cells,isHead=false)=>{
      const font=isHead?bold:regular,size=isHead?7.5:8.5;
      const chunks=cells.map((v,i)=>wrap(v,widthsPt[i]-8,size,font));let index=0;
      const count=Math.max(...chunks.map(v=>v.length));
      while(index<count){if(y+20>H-bottom){newPage();if(!isHead)drawRow(headers,true);}
        const capacity=Math.max(1,Math.floor((H-bottom-y-8)/11));const take=Math.min(count-index,capacity),h=take*11+8;let x=M;
        chunks.forEach((lines,i)=>{rect(x,y,widthsPt[i],h,isHead?color(232,222,202):cream);for(let j=0;j<take;j++)if(lines[index+j]!==undefined)draw(lines[index+j],x+4,y+4+j*11,size,font);x+=widthsPt[i];});y+=h;index+=take;
      }
    }; ensure(42);drawRow(headers,true);for(const row of rows.length?rows:[headers.map((_,i)=>i===0?"—":"")])drawRow(row);y+=8;
  };
  newPage();
  rounded(M,34,CW,132,color(243,234,215),7);page.drawRectangle({x:M+7,y:H-36,width:CW-14,height:2,color:color(120,85,64)});
  rounded(M+7,42,76,116,color(230,220,197),5);image("portrait",M+9,44,72,112);if(!embedded.portrait)center("RETRATO",M+7,95,76,8,regular,muted);
  if(logoBytes){try{const logo=await doc.embedPng(logoBytes);const d=logo.scaleToFit(85,42);page.drawImage(logo,{x:W-M-9-d.width,y:H-42-d.height,width:d.width,height:d.height});}catch{/* optional */}}
  draw("NOME DO PERSONAGEM",M+91,76,8,bold,muted);fitted(actor.name,M+91,88,CW-105,21,serif);
  const ix=M+91, iw=CW-98;mini(ix,116,iw*.40-3,36,"Origem",ORIGINS[s.origem]?.[0]);mini(ix+iw*.40,116,iw*.45-3,36,"Classe",[klass?.label,s.nivel>=5?klass?.paths?.[s.trilha]?.[0]:null].filter(Boolean).join(" / "));mini(ix+iw*.85,116,iw*.15,36,"Nível",s.nivel);
  panel("Estado do personagem",172,144);const vitals=[["Saúde",pool(s.saude)],["Meia vida",Math.floor(s.saude.max/2)],["Magia",pool(s.magia)],["Ações",pool(s.acoes)],["Movimento",`${s.movimento} m`],["Defesa",s.defesa],["Defesa mágica",s.defesaMagica],["Proteção",s.protecao],["Impulsos",{write:true}],["Recuo",{write:true}]];const red=color(167,82,79),green=color(85,117,109), vtones=[red,red,purple,gold,green,gold,purple,gold,purple,red];const inner=CW-14, ww=(inner-16)/5;
  vitals.forEach(([l,v],i)=>mini(M+7+(i%5)*(ww+4),200+Math.floor(i/5)*38,ww,34,l,v,vtones[i]));
  const moon=[["Signo lunar",MOONS[s.lua-1]],["Dados lunares",{write:true}],["Luas no céu",sky.map(i=>MOONS[i-1]).filter(Boolean).join(", ")||"—"]];moon.forEach(([l,v],i)=>mini(M+7+i*((inner-8)/3+4),276,(inner-8)/3,33,l,v));
  panel("Características",322,119);const attrs=Object.entries(ATTRIBUTES);const aw=(inner-12)/4;draw("CONCRETAS",M+7,349,8,bold,purple);draw("ABSTRATAS",M+7+inner/2,349,8,bold,purple);
  attrs.forEach(([key,label],i)=>{const group=Math.floor(i/4),j=i%4,x=M+7+(group*2+j%2)*(aw+4),top=360+Math.floor(j/2)*37;rounded(x,top,aw,33);image(`attr-${key}`,x+5,top+6,20,20);fitted(label,x+29,top+5,aw-34,8,bold,muted);draw(s.caracteristicas?.[key],x+29,top+15,13,serif);});
  const skills=Object.entries(SKILLS).sort((a,b)=>a[1][0].localeCompare(b[1][0],"pt-BR"));const sw=(inner-8)/3;const rowH=35;panel("Aptidões",447,35+Math.ceil(skills.length/3)*rowH+12);
  skills.forEach(([key,[label]],i)=>{const attr=attributeFor(actor,key),rank=Math.min(s.aptidoes?.[key]??0,rankLimit(s.nivel)),die=SCALE[rank],tone=["forca","corpo","agilidade","destreza"].includes(attr)?gold:purple,x=M+7+i%3*(sw+4),top=475+Math.floor(i/3)*rowH;rounded(x,top,sw,32,cream,4);page.drawRectangle({x:x+1,y:H-top-29,width:2,height:26,color:tone});image(`d${die}`,x+6,top+3,20,20);page.drawRectangle({x:x+12,y:H-top-28,width:17,height:9,color:tone});center(`d${die}`,x+12,top+19,17,7,bold,color(255,255,255));fitted(label,x+34,top+3,sw-39,10,serif);draw(ATTRIBUTES[attr],x+34,top+14,7,regular,muted);const mastery=s.maestrias?.[key];const bw=(sw-45)/7;SCALE.forEach((_,k)=>page.drawRectangle({x:x+34+k*bw,y:H-top-24,width:bw-2,height:2,color:k<=rank?tone:color(228,218,197)}));if(mastery)fitted(mastery,x+34,top+24,sw-39,6,regular,muted);});
  draw("Trunfo: avance na escala · Fardo: recue na escala.",M+7,758,8,regular,muted);
  newPage();
  title("Equipamentos");cards(Object.entries(equipmentSlots(actor)).map(([slot,id])=>[SLOT_LABELS[slot],items.find(i=>i.id===id)?.name||"—"]),3);
  const subheading=label=>{ensure(32);draw(label,M+3,y,10,bold,purple);y+=15;};
  subheading("Armas");table(["Arma","Aptidão","Dano","Mãos","Propriedades"],[.25,.19,.12,.17,.27],by("arma").map(i=>[i.name,SKILLS[i.system.aptidao]?.[0],displayDamage(actor,i.system.dano),i.system.duasMaos?"Duas mãos":"Uma mão",i.system.propriedades]));
  subheading("Armaduras e escudos");table(["Nome","Defesa","Proteção","Fardos"],[.52,.16,.16,.16],by("armadura").map(i=>[i.name,i.system.defesa,i.system.protecao,i.system.fardos]));
  subheading("Inventário");table(["Item","Quantidade","Descrição"],[.30,.15,.55],by("equipamento").map(i=>[i.name,i.system.quantidade,plain(i.system.descricao)]));cards([['Solares',s.moedas?.solares],['Lunares',s.moedas?.lunares],['Estelares',s.moedas?.estelares]],3);
  title("Formulações");for(const i of by("formulacao")){const f=i.system;textBlock(i.name,displayDamage(actor,[[f.forma,f.palavra,f.palavraExtra].filter(Boolean).join(" / "),f.ampliacao,`${Number(f.custoForma||0)+Number(f.custoPalavra||0)+Number(f.custoExtra||0)} PM · ${f.custoAcao} ação(ões)`,f.dano,f.alcance,f.alvos,f.duracao,plain(f.descricao)].filter(Boolean).join(" · ")));}if(!by("formulacao").length)textBlock("—","");
  for(const [type,label] of [["proeza","Proezas"],["traco","Traços"]]){title(label);for(const i of by(type))textBlock(i.name,displayDamage(actor,[i.system.tipoAcao,i.system.custoAcao?`${i.system.custoAcao} ação(ões)`:null,i.system.maxUsos?`Usos ${i.system.usos}/${i.system.maxUsos}`:null,plain(i.system.descricao)].filter(Boolean).join(" · ")));if(!by(type).length)textBlock("—","");}
  title("Bênçãos lunares");for(const [name,desc] of MOON_BLESSINGS[s.lua-1]??[])textBlock(name,desc);
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
  let logo=null;try{const response=await fetch(new URL(`${PATH}/assets/logo-transparent.png`,document.baseURI));if(response.ok)logo=await response.arrayBuffer();}catch{/* optional logo */}
  const artwork={};
  const loadImage=async(key,src,size)=>{try{const img=new Image();img.crossOrigin="anonymous";img.src=new URL(src,document.baseURI).href;await Promise.race([img.decode(),new Promise((_,reject)=>setTimeout(()=>reject(new Error("Imagem indisponível")),5000))]);const canvas=document.createElement("canvas");const scale=size/Math.max(img.naturalWidth,img.naturalHeight);canvas.width=Math.max(1,Math.round(img.naturalWidth*scale));canvas.height=Math.max(1,Math.round(img.naturalHeight*scale));canvas.getContext("2d").drawImage(img,0,0,canvas.width,canvas.height);const blob=await new Promise(resolve=>canvas.toBlob(resolve,"image/png"));if(blob)artwork[key]=await blob.arrayBuffer();}catch{/* imagem opcional */}};
  await Promise.all([...Object.keys(ATTRIBUTES).map(k=>loadImage(`attr-${k}`,`${PATH}/assets/icons/atributo-${k}.svg`,96)),...SCALE.map(d=>loadImage(`d${d}`,`${PATH}/assets/d${d}.svg`,96)),...(actor.img?[loadImage("portrait",actor.img,600)]:[])]);
  let fonts=null;try{const {default:kit}=await import("./vendor/fontkit.mjs");const font=async name=>{const response=await fetch(new URL(`${PATH}/assets/fonts/${name}.ttf`,document.baseURI));if(!response.ok)throw Error("Fonte indisponível");return response.arrayBuffer();};const [regular,bold,serif]=await Promise.all([font("LiberationSans-Regular"),font("LiberationSans-Bold"),font("LiberationSerif-Bold")]);fonts={kit,regular,bold,serif};}catch{/* standard fonts remain available */}
  const bytes=await buildCharacterPDF(actor,game.settings.get(SYSTEM,"luas"),logo,artwork,fonts);
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
