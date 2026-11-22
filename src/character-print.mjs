import { SYSTEM, PATH, SCALE, ATTRIBUTES, SKILLS, CLASSES, ORIGINS, MOONS, rankLimit } from "./rules.mjs";
import { attributeFor } from "./actions.mjs";
import { equipmentSlots, SLOT_LABELS } from "./equipment.mjs";
import { MOON_BLESSINGS } from "./moon-blessings.mjs";

const escape = value => String(value ?? "").replace(/[&<>"']/g, c => ({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
const plain = value => {
  const doc = new DOMParser().parseFromString(String(value ?? ""), "text/html");
  doc.querySelectorAll("script,style,template").forEach(node=>node.remove());
  doc.querySelectorAll("p,div,li,br").forEach(node=>node.append("\n"));
  return doc.body.textContent.trim();
};
const fmt = value => escape(value ?? "—");
const card = (label, value) => `<div class="card"><small>${escape(label)}</small><strong>${fmt(value)}</strong></div>`;
const table = (headers, rows) => `<table><thead><tr>${headers.map(h=>`<th>${escape(h)}</th>`).join("")}</tr></thead><tbody>${rows.map(row=>`<tr>${row.map(v=>`<td>${fmt(v)}</td>`).join("")}</tr>`).join("") || `<tr><td colspan="${headers.length}">—</td></tr>`}</tbody></table>`;
const section = (title, body) => `<section><h2>${escape(title)}</h2>${body}</section>`;
const details = (title, entries) => section(title, entries.map(([name, description]) => `<article><h3>${escape(name)}</h3><p>${escape(description)}</p></article>`).join("") || "<p>—</p>");
const pool = p => `${p?.value ?? 0} / ${p?.max ?? 0}`;

export function characterPrintHTML(actor, sky = [], logo = "") {
  const s = actor.system, klass = CLASSES[s.classe];
  const items = [...actor.items].sort((a,b)=>a.sort-b.sort);
  const by = type => items.filter(i=>i.type===type);
  const slots = equipmentSlots(actor);
  const skills = Object.entries(SKILLS).sort((a,b)=>a[1][0].localeCompare(b[1][0],"pt-BR"));
  const skillRows = rows => rows.map(([key,[label]])=>[label, ATTRIBUTES[attributeFor(actor,key)] ?? "—", `d${SCALE[Math.min(s.aptidoes?.[key] ?? 0,rankLimit(s.nivel))]}`, s.maestrias?.[key] || "—"]);
  const mid = Math.ceil(skills.length/2);
  const skillTable = rows => table(["Aptidão","Característica","Dado","Maestria"],skillRows(rows));
  const head = `<header>${logo?`<img src="${escape(logo)}" alt="Lunatar RPG">`:"<h1>LUNATAR RPG</h1>"}<div><small>FICHA DE PERSONAGEM</small><h1>${escape(actor.name)}</h1><p>${fmt(ORIGINS[s.origem]?.[0])} · ${fmt(klass?.label)}${s.nivel>=5 && klass?.paths?.[s.trilha] ? ` / ${escape(klass.paths[s.trilha][0])}`:""} · Nível ${fmt(s.nivel)}</p></div></header>`;
  const vitals = [["Saúde",pool(s.saude)],["Meia vida",Math.floor(s.saude.max/2)],["Magia",pool(s.magia)],["Ações",pool(s.acoes)],["Movimento",`${s.movimento} m`],["Defesa",s.defesa],["Defesa mágica",s.defesaMagica],["Proteção",s.protecao],["Impulsos",s.impulsos],["Recuo",s.recuo]];
  const lunar = [["Signo lunar",MOONS[s.lua-1]],["Dados lunares",s.dadoLunar],["Luas no céu",sky.map(i=>MOONS[i-1]).filter(Boolean).join(", ")||"—"]];
  const weapons = by("arma").map(i=>[i.name, SKILLS[i.system.aptidao]?.[0], i.system.dano, i.system.duasMaos?"Duas mãos":"Uma mão",i.system.propriedades]);
  const armor = by("armadura").map(i=>[i.name,i.system.defesa,i.system.protecao,i.system.fardos]);
  const formulas = by("formulacao").map(i=>{const f=i.system; return [i.name,[f.forma,f.palavra,f.palavraExtra].filter(Boolean).join(" / "),f.ampliacao,Number(f.custoForma)+Number(f.custoPalavra)+Number(f.custoExtra),f.custoAcao,f.dano,[f.alcance,f.alvos,f.duracao].filter(Boolean).join(" · ")];});
  const feature = i => [i.name, [i.system.tipoAcao,i.system.custoAcao ? `${i.system.custoAcao} ação(ões)` : "", i.system.maxUsos ? `Usos ${i.system.usos}/${i.system.maxUsos}` : "",plain(i.system.descricao)].filter(Boolean).join(" · ")];
  return `<!doctype html><html lang="pt-BR"><head><meta charset="utf-8"><title>${escape(actor.name)} - Lunatar RPG</title><style>
@page{size:A4;margin:12mm}*{box-sizing:border-box}body{font:10pt Arial,sans-serif;color:#292622;background:white;margin:0;overflow-wrap:anywhere}main{max-width:186mm;margin:auto}header{display:flex;gap:20px;align-items:center;border-bottom:2px solid #514536;padding-bottom:8px}header img{width:48mm;height:auto;object-fit:contain}h1,h2{font-family:Georgia,serif}h1{font-size:22pt;margin:3px 0}h2{font-size:14pt;border-bottom:1px solid #898379;padding-bottom:4px;margin:15px 0 7px}h3{font-size:10pt;margin:0 0 4px}p{margin:3px 0;white-space:pre-wrap}small{font-size:8pt;color:#645e55}.grid{display:grid;grid-template-columns:repeat(5,minmax(0,1fr));gap:5px}.lunar,.slots{grid-template-columns:repeat(3,minmax(0,1fr))}.attrs{grid-template-columns:repeat(4,minmax(0,1fr))}.card{text-align:center;border:1px solid #bdb7aa;border-radius:5px;padding:7px 4px;min-height:41px;break-inside:avoid}.card small,.card strong{display:block}.card strong{font: bold 14pt Georgia,serif;margin-top:4px}.lunar .card strong,.slots .card strong{font-size:10pt}.columns{display:grid;grid-template-columns:1fr 1fr;gap:8px}table{width:100%;border-collapse:collapse;font-size:8pt;table-layout:auto}th,td{border:1px solid #bdb7aa;padding:5px 4px;text-align:left;vertical-align:top}th{background:#f0ede7;font-size:7pt}thead{display:table-header-group}tr,article{break-inside:avoid}article{border:1px solid #bdb7aa;border-radius:5px;padding:8px;margin:5px 0}h2,h3{break-after:avoid}.next{break-before:page}footer{border-top:1px solid #aaa;margin-top:12px;padding-top:5px;font-size:7pt;color:#645e55}.toolbar{position:sticky;top:0;background:#f5f2eb;padding:10px;text-align:center;z-index:1}button{padding:8px 18px;border:1px solid #756b5e;border-radius:6px;background:white;color:#292622;cursor:pointer;font-weight:bold}@media screen{main{padding:12px;box-shadow:0 0 12px #ddd;margin:10px auto}.next{margin-top:30px}}@media print{.toolbar{display:none}main{max-width:none}body{-webkit-print-color-adjust:exact;print-color-adjust:exact}}
</style></head><body><div class="toolbar"><button id="print" type="button">Imprimir / Salvar PDF</button><p>Escolha “Salvar como PDF” no destino de impressão.</p></div><main>${head}
${section("Estado do personagem",`<div class="grid">${vitals.map(x=>card(...x)).join("")}</div><div class="grid lunar" style="margin-top:5px">${lunar.map(x=>card(...x)).join("")}</div>`)}
${section("Características",`<div class="grid attrs">${Object.entries(ATTRIBUTES).map(([k,l])=>card(l,s.caracteristicas?.[k])).join("")}</div>`)}
${section("Aptidões",`<div class="columns">${skillTable(skills.slice(0,mid))}${skillTable(skills.slice(mid))}</div><p><small>Trunfo: avance na escala · Fardo: recue na escala.</small></p>`)}
${section("Equipamento em uso",`<div class="grid slots">${Object.entries(slots).map(([slot,id])=>card(SLOT_LABELS[slot],items.find(i=>i.id===id)?.name || "—")).join("")}</div>`)}
<div class="next">${section("Armas",table(["Arma","Aptidão","Dano","Mãos","Propriedades"],weapons))}${section("Armaduras e escudos",table(["Nome","Defesa","Proteção","Fardos"],armor))}${section("Formulações",table(["Nome","Forma / Palavra","Ampliação","PM","Ações","Dano","Alcance / alvos / duração"],formulas))}
${details("Efeitos das formulações",by("formulacao").filter(i=>i.system.descricao).map(i=>[i.name,plain(i.system.descricao)]))}${details("Proezas",by("proeza").map(feature))}${details("Traços",by("traco").map(feature))}${details("Bênçãos lunares",MOON_BLESSINGS[s.lua-1]??[])}
${section("Inventário",table(["Item","Quantidade","Descrição"],by("equipamento").map(i=>[i.name,i.system.quantidade,plain(i.system.descricao)])))}${section("Moedas",`<div class="grid slots">${["solares","lunares","estelares"].map(k=>card(k,s.moedas?.[k])).join("")}</div>`)}
${details("Anotações",[["História",plain(s.notas)],["Marcas e condições",[plain(s.marcas),...[...actor.statuses].map(id=>CONFIG.statusEffects.find(e=>e.id===id)?.name??id)].filter(Boolean).join(" · ")],["Desafios superados",String(s.desafios??0)]])}</div><footer>Lunatar RPG · Ficha não oficial · Colucci / New Order Editora</footer></main></body></html>`;
}

export async function exportCharacterPDF(actor) {
  if (actor.type !== "personagem" || !actor.isOwner) return;
  const { exportCharacterPDF: download } = await import("./character-pdf-direct.mjs");
  return download(actor);
}
