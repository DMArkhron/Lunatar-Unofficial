export const SYSTEM = "lunatar-unofficial";
export const PATH = `systems/${SYSTEM}`;
export const SCALE = [4, 6, 8, 10, 12, 16, 20];

export const ATTRIBUTES = {
  forca: "Força", corpo: "Corpo", agilidade: "Agilidade", destreza: "Destreza",
  inteligencia: "Inteligência", instinto: "Instinto",
  presenca: "Presença", personalidade: "Personalidade"
};
export const CONCRETE = Object.keys(ATTRIBUTES).slice(0, 4);
export const SKILLS = {
  astucia: ["Astúcia", "instinto"], atletismo: ["Atletismo", "corpo"],
  ataque: ["Ataque", "forca"], ataqueMagico: ["Ataque Mágico", ""],
  conducao: ["Condução", "destreza"], esquiva: ["Esquiva", "agilidade"],
  expressao: ["Expressão", "personalidade"], furtividade: ["Furtividade", "destreza"],
  iniciativa: ["Iniciativa", "agilidade"], intuicao: ["Intuição", "instinto"],
  ladroagem: ["Ladroagem", "destreza"], manipulacao: ["Manipulação", "presenca"],
  misticismo: ["Misticismo", "inteligencia"], natureza: ["Natureza", "instinto"],
  ocultismo: ["Ocultismo", "inteligencia"], pontaria: ["Pontaria", "destreza"],
  resistencia: ["Resistência", "corpo"], razao: ["Razão", "inteligencia"],
  saber: ["Saber", "inteligencia"], sobrevivencia: ["Sobrevivência", "instinto"],
  teurgia: ["Teurgia", "presenca"]
};
export const CLASSES = {
  adepto: { label: "Adepto", hp: [8, 4], def: [5, "corpo"], ward: [5, "instinto"],
    cast: "teurgia", form: "presenca",
    paths: { cruzado: ["Cruzado", 12, 8], sacerdote: ["Sacerdote", 9, 4], shura: ["Shura", 11, 8] } },
  combatente: { label: "Combatente", hp: [10, 8], def: [7, "corpo"], ward: [3, "instinto"],
    paths: { barbaro: ["Bárbaro", 13, 11], cavaleiro: ["Cavaleiro", 12, 10], lamina: ["Lâmina Lunar", 11, 9] } },
  mistico: { label: "Místico", hp: [6, 3], def: [3, "corpo"], ward: [7, "inteligencia"],
    cast: "misticismo", form: "inteligencia",
    paths: { feiticeiro: ["Feiticeiro", 7, 4], mago: ["Mago", 7, 4], pactuado: ["Pactuado", 8, 5] } },
  naturalista: { label: "Naturalista", hp: [8, 5], def: [5, "corpo"], ward: [5, "instinto"],
    cast: "natureza", form: "instinto",
    paths: { cacador: ["Caçador", 10, 8], druida: ["Druida", 9, 7], xama: ["Xamã", 8, 6] } },
  renegado: { label: "Renegado", hp: [7, 4], def: [4, "corpo", "agilidade"],
    ward: [5, "instinto", "personalidade"],
    paths: { executor: ["Executor", 9, 6], trapaceiro: ["Trapaceiro", 8, 5], gatuno: ["Gatuno", 8, 4] } }
};

const all = Object.keys(ATTRIBUTES);
export const ORIGINS = {
  anfibio: ["Faunni · Anfíbio", 7, ["instinto"], ["destreza"]],
  ave: ["Faunni · Ave", 7, ["instinto"], ["destreza"]],
  suino: ["Faunni · Suíno", 7, ["corpo"], ["presenca"]],
  canideo: ["Faunni · Canídeo", 7, ["agilidade"], ["instinto"]],
  humano: ["Humano", 5, all, all],
  elohin: ["Elohin", 5, ["agilidade", "destreza"], ["instinto", "inteligencia"]],
  fahadjin: ["Fahad’jin", 4, ["corpo", "inteligencia"], ["instinto", "personalidade"]],
  yukkhan: ["Yuk’khan", 6, ["corpo", "forca"], ["personalidade", "instinto"]]
};
export const MOONS = ["Rebelde", "Amante", "Bufão", "Camponês", "Exploradora", "Heroína",
  "Inocente", "Irmã", "Maga", "Protetora", "Regente", "Sábia"];
export const ITEM_LABELS = {
  arma: "Armas", armadura: "Armaduras e escudos", equipamento: "Equipamentos",
  proeza: "Proezas", traco: "Traços", classe: "Classes", formulacao: "Formulações"
};
export const CONDITIONS = {
  atordoado: "Atordoado", caido: "Caído", cego: "Cego", confuso: "Confuso",
  danoContinuo: "Dano contínuo", enfraquecido: "Enfraquecido", exausto: "Exausto",
  furtivo: "Furtivo", imobilizado: "Imobilizado", medo: "Medo", provocado: "Provocado",
  restrito: "Restrito", surdo: "Surdo", agarrado: "Agarrado", controlado: "Controlado",
  drenado: "Drenado", etereo: "Etéreo", paralisado: "Paralisado",
  petrificado: "Petrificado", sono: "Sono", surpreso: "Surpreso", voo: "Voo"
};

export const rankLimit = level => level >= 9 ? 6 : level >= 5 ? 5 : 4;
export const clamp = (value, min, max) => Math.min(max, Math.max(min, value));

export function scaleRoll(rank, limit, trumps = 0, burdens = 0) {
  const raw = clamp(rank, 0, limit) + clamp(trumps, 0, 2) - Math.max(0, burdens);
  return { die: SCALE[clamp(raw, 0, limit)], edge: 2 * (Math.min(0, raw) + Math.max(0, raw - limit)) };
}

export function outcome(total, target, opposed, ties) {
  if (target === null) return null;
  const margin = total - target;
  return {
    success: margin > 0 || (margin === 0 && (!opposed || ties === "acao")),
    impulso: Math.max(0, margin),
    recuo: Math.max(0, -margin)
  };
}

export function testSpec(actor, skill, { trumps = 0, burdens = 0, bonus = 0, attribute, repeat = 0 } = {}) {
  const system = actor.system;
  const character = actor.type === "personagem";
  const concrete = CONCRETE.includes(attribute);
  const armor = ["atletismo", "furtividade"].includes(skill) ? (system.fardoArmadura ?? 0) : 0;
  const half = character && concrete && system.saude.value <= Math.floor(system.saude.max / 2) ? 1 : 0;
  const condition = Number(actor.statuses?.has("atordoado") ?? false)
    + Number(concrete && (actor.statuses?.has("caido") ?? false))
    + Number(concrete && (actor.statuses?.has("exausto") ?? false))
    + (["forca", "corpo"].includes(attribute) && actor.statuses?.has("enfraquecido") ? 2 : 0);
  const rank = system.aptidoes[skill];
  const scale = scaleRoll(rank, character ? rankLimit(system.nivel) : 6,
    trumps, burdens + repeat + armor + half + condition);
  const mod = (character ? system.nivel + system.caracteristicas[attribute]
    : (concrete ? system.concreto : system.abstrato)) + scale.edge + bonus;
  return { ...scale, mod, armor, half, condition, formula: `1d${scale.die} + (${mod})` };
}

export function healthBase(system) {
  const entry = CLASSES[system.classe];
  if (!entry) return 0;
  const level = system.nivel;
  const body = system.caracteristicas.corpo;
  const path = entry.paths[system.trilha];
  const advanced = level >= 5 && path;
  const connection = system.classe === "naturalista" && system.trilhaNatureza === "conexao" ? 4 : 0;
  return entry.hp[0] + body + connection + (advanced
    ? 3 * (entry.hp[1] + body) + path[1] + body + (level - 5) * (path[2] + body)
    : (level - 1) * (entry.hp[1] + body));
}

export function magicBase(system) {
  const entry = CLASSES[system.classe];
  if (!entry?.form) return 0;
  const table = system.classe === "mistico"
    ? [10, 12, 15, 17, 20, 22, 24, 26, 28, 30, 32, 34]
    : [8, 10, 12, 13, 16, 18, 20, 22, 25, 27, 29, 31];
  const spirit = system.classe === "naturalista" && system.trilhaNatureza === "espiritualidade" ? 2 : 0;
  return table[system.nivel - 1] + system.caracteristicas[entry.form] + spirit;
}

export function defenseBase(system, key) {
  const entry = CLASSES[system.classe]?.[key];
  if (!entry) return 0;
  const attribute = entry.includes(system[key + "Atributo"]) ? system[key + "Atributo"] : entry[1];
  return entry[0] + system.caracteristicas[attribute] + system.nivel;
}

export function validDistribution(values, expected) {
  return values.length === expected.length
    && [...values].sort((a, b) => a - b).every((value, i) => value === expected[i]);
}
