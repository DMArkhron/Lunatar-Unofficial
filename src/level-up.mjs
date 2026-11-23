import { SYSTEM, PATH, SCALE, ATTRIBUTES, SKILLS, CLASSES, rankLimit, healthBase, magicBase, defenseBase } from "./rules.mjs";
import { serialize } from "./actions.mjs";
const esc=v=>String(v??"").replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
const dialog=foundry.applications.api.DialogV2;
const open=new Set();
const norm=v=>String(v??"").normalize("NFD").replace(/\p{M}/gu,"").toLowerCase().trim();
export function advancement(system, selections) {
  const level=system.nivel+1, klass=CLASSES[system.classe];
  if(!klass||level>12)throw Error("Classe ou nível inválido.");
  const changes={"system.nivel":level};
  const summary=[];
  if(level===5){if(!Object.hasOwn(klass.paths,selections.path))throw Error("Escolha uma Classe Superior.");changes["system.trilha"]=selections.path;summary.push("Classe Superior: "+klass.paths[selections.path][0]);}
  if(level%2===0){
    const key=selections.skill,old=system.aptidoes[key];
    if(!Object.hasOwn(SKILLS,key)||!Number.isInteger(old)||old>=rankLimit(level))throw Error("Escolha uma aptidão abaixo do limite.");
    changes["system.aptidoes."+key]=old+1;summary.push(SKILLS[key][0]+": d"+SCALE[old]+" → d"+SCALE[old+1]);
  }else{
    const key=selections.attr,old=system.caracteristicas[key];
    if(!Object.hasOwn(ATTRIBUTES,key)||!Number.isInteger(old)||old>=5)throw Error("Escolha uma característica com valor até 4.");
    changes["system.caracteristicas."+key]=old+1;summary.push(ATTRIBUTES[key]+": "+old+" → "+(old+1));
  }
  return {level,changes,summary};
}
const snapshot=s=>JSON.stringify([s.nivel,s.classe,s.trilha,Object.entries(ATTRIBUTES).map(([k])=>s.caracteristicas[k]),Object.entries(SKILLS).map(([k])=>s.aptidoes[k])]);
export function eligibleFeats(docs,actor,level,path){
 const names=[CLASSES[actor.system.classe].label,CLASSES[actor.system.classe].paths[path]?.[0]].filter(Boolean).map(norm);
 return docs.filter(d=>{const match=String(d.system.fonte??"").match(/^(.*?)\s*·\s*Nível\s*(\d+)$/i);return d.type==="proeza"&&match&&names.includes(norm(match[1]))&&Number(match[2])<=level&&!actor.items.some(i=>i.type==="proeza"&&norm(i.name)===norm(d.name)&&norm(i.system.fonte).split(" · ")[0]===norm(match[1]));});
}
async function choose(title, rows, note=""){
 if(!rows.length)throw Error("Não há escolhas disponíveis: "+title);
 const content='<div class="ln-wizard"><div class="ln-wizard-callout"><p>'+esc(note)+'</p></div><div class="ln-wizard-grid">'+rows.map((r,i)=>'<label class="ln-wizard-field"><input type="radio" name="choice" value="'+esc(r.id)+'" '+(i===0?'checked':'')+'><strong>'+esc(r.label)+'</strong><small style="display:block;white-space:normal">'+esc(r.description||"")+'</small></label>').join("")+'</div></div>';
 return dialog.prompt({window:{title},classes:["lunatar","lunatar-generator"],position:{width:680},content,modal:true,rejectClose:false,ok:{label:"Continuar",callback:(_e,b)=>new FormData(b.form).get("choice")}});
}
export async function levelUp(actor){
 if(actor.type!=="personagem"||!actor.isOwner||open.has(actor.uuid))return;
 if(actor.system.nivel>=12){ui.notifications.info("Nível máximo atingido.");return;}
 if(!CLASSES[actor.system.classe])throw Error("Selecione uma classe básica.");
 open.add(actor.uuid);
 try{
 const s=actor.system, initial=snapshot(s), target=s.nivel+1, klass=CLASSES[s.classe], picked={};
 if(target===5){picked.path=await choose("Classe Superior · nível 5",Object.entries(klass.paths).map(([id,[label,hp,next]])=>({id,label,description:"Saúde no nível 5: "+hp+" + Corpo; níveis seguintes: "+next+" + Corpo"})),"Escolha a especialização da sua classe.");if(!picked.path)return;}
 const even=target%2===0;
 const rows=even?Object.entries(SKILLS).filter(([k])=>s.aptidoes[k]<rankLimit(target)).map(([id,[label]])=>({id,label,description:"d"+SCALE[s.aptidoes[id]]+" → d"+SCALE[s.aptidoes[id]+1]})):Object.entries(ATTRIBUTES).filter(([k])=>s.caracteristicas[k]<5).map(([id,label])=>({id,label,description:s.caracteristicas[id]+" → "+(s.caracteristicas[id]+1)}));
 const pick=await choose("Nível "+target+" · "+(even?"Graduação":"Característica"),rows,even?"Distribua uma graduação. Limite d"+SCALE[rankLimit(target)]:"Aumente uma característica em 1, até o máximo de 5.");if(!pick)return;picked[even?"skill":"attr"]=pick;
 const plan=advancement(s,picked);
 const pack=game.packs.get(SYSTEM+".proezas");if(!pack)throw Error("Compêndio de Proezas indisponível.");
 const feats=eligibleFeats(await pack.getDocuments(),actor,target,picked.path??s.trilha);
 const id=await choose("Nível "+target+" · Proeza",feats.length?feats.map(d=>({id:d.id,label:d.name,description:d.system.fonte+" — "+String(d.system.descricao??"").replace(/<[^>]*>/g,"")})):[{id:"pending",label:"Registrar Proeza pendente",description:"O compêndio não possui outra Proeza elegível. Combine a escolha com o mestre."}],"Escolha uma nova Proeza da sua classe, até o nível alcançado.");if(!id)return;
 const feat=feats.find(d=>d.id===id);if(!feat&&id!=="pending")return;
 const next={...s.toObject(),nivel:target,trilha:picked.path??s.trilha,caracteristicas:{...s.caracteristicas}};
 if(picked.attr)next.caracteristicas[picked.attr]++;
 const stats=[["PS máximo",s.saude.max,s.manual.saude??Math.max(1,s.saude.max+healthBase(next)-healthBase(s))],["PM máximo",s.magia.max,s.manual.magia??Math.max(0,s.magia.max+magicBase(next)-magicBase(s))],["Defesa",s.defesa,s.manual.defesa??Math.max(0,s.defesa+defenseBase(next,"def")-defenseBase(s,"def"))],["Defesa Mágica",s.defesaMagica,s.manual.defesaMagica??Math.max(0,s.defesaMagica+defenseBase(next,"ward")-defenseBase(s,"ward"))]];
 const featLabel=feat?.name??"Pendente (compêndio sem opções elegíveis)";
 const content='<div class="ln-wizard"><h2>Nível '+s.nivel+' → '+target+'</h2><div class="ln-wizard-grid">'+stats.map(([l,a,b])=>'<div class="ln-wizard-field">'+esc(l)+' <strong>'+a+' → '+b+'</strong></div>').join("")+'</div><ul>'+[...plan.summary,"Proeza: "+featLabel,"Limite de dado: d"+SCALE[rankLimit(target)]].map(t=>'<li>'+esc(t)+'</li>').join("")+'</ul><p>PS e PM atuais permanecem como estão. Nenhuma escolha será aplicada antes de confirmar.</p></div>';
 if(!await dialog.confirm({window:{title:"Confirmar subida de nível"},content,modal:true,rejectClose:false}))return;
 await serialize(actor,async()=>{if(snapshot(actor.system)!==initial)throw Error("A ficha mudou. Abra o assistente novamente.");let created=[];if(feat){if(!eligibleFeats([feat],actor,target,picked.path??s.trilha).length)throw Error("Proeza já adquirida.");const data=feat.toObject();delete data._id;delete data.folder;created=await actor.createEmbeddedDocuments("Item",[data]);}else{plan.changes["system.notas"]=[actor.system.notas,"Proeza pendente — nível "+target].filter(Boolean).join("\n");}try{await actor.update(plan.changes);}catch(error){if(created.length)await actor.deleteEmbeddedDocuments("Item",created.map(i=>i.id));throw error;}});
 ui.notifications.info(actor.name+" chegou ao nível "+target+": "+[...plan.summary,featLabel].join(" · "));
 }finally{open.delete(actor.uuid);}
}

