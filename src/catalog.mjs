import { PATH } from "./rules.mjs";
import { RECORD_ICONS } from "./icon-index.mjs";

// Nomes e parâmetros de jogo das pp. 58 e 64–73 do playtest.
export const ARMOR = [
  ["Armadura Leve", 1, 0], ["Armadura Média", 2, 1], ["Armadura Pesada", 3, 2],
  ["Escudo Leve", 1], ["Escudo Médio", 2], ["Escudo Pesado", 3]
].map(([name, value, burden]) => ({ name, type: "armadura", system: burden === undefined
  ? { escudo: true, defesa: value } : { protecao: value, fardos: burden } }));

export const WEAPONS = [
  ["Adaga", "1d4", "Ágil · Arremesso (10 m)"], ["Bastão", "1d6", ""], ["Clava", "1d8", "Bruta 1"],
  ["Claymore", "1d10", "Duas Mãos · Mortífera"], ["Espada Curta", "1d6", "Mortífera"],
  ["Espada Longa", "1d8", "Versátil"], ["Florete", "1d6", "Elegante · Mortífera"],
  ["Lança", "1d8", "Alcance · Perfurante"], ["Machado de Batalha", "1d10", "Duas Mãos · Bruta 2"],
  ["Martelo de Guerra", "1d12", "Duas Mãos · Demolidora"],
  ["Arco Curto", "1d6", "Ágil", 10], ["Arco Longo", "1d8", "", 12],
  ["Besta Pequena", "1d6", "Ágil · Recarga", 15], ["Besta Pesada", "1d8", "Duas Mãos · Recarga", 20]
].map(([name, dano, propriedades, alcance = 0]) => ({ name, type: "arma", system: {
  dano, propriedades, alcance, aptidao: alcance ? "pontaria" : "ataque",
  atributoDano: propriedades.includes("Elegante") ? "destreza" : "forca",
  adicionarAtributo: !alcance, perfurante: propriedades.includes("Perfurante"),
  duasMaos: propriedades.includes("Duas Mãos"), mortifera: propriedades.includes("Mortífera"),
  versatil: propriedades.includes("Versátil"), bruta: Number(propriedades.match(/Bruta (\d+)/)?.[1] ?? 0)
} }));

export const MAGIC = {
  adepto: {
    forms: [["Aura", 2, "10 m", "1"], ["Disparo", 2, "5 m", "1"],
      ["Projeção", 2, "15 m", "1"], ["Redoma", 4, "Próprio", "Área"], ["Toque", 1, "Toque", "1"]],
    words: [["Bênção", 2], ["Cura", 2], ["Expurgar", 2, "1d6 + @formulacao"], ["Ordem Divina", 3],
      ["Proteção", 2], ["Ruína", 3, "1d10 + @formulacao"], ["Sacrifício", 2], ["Vínculo", 4]]
  },
  mistico: {
    forms: [["Cone", 2, "3 m", "Múltiplos"], ["Disparo", 1, "5 m", "1"], ["Linha", 3, "10 m", "Múltiplos"],
      ["Toque", 1, "Toque", "1"], ["Vórtice", 4, "10 m", "Múltiplos"]],
    words: [["Elemento", 1, "1d6 + @formulacao"], ["Energia", 2, "1d8 + @formulacao"], ["Ferida", 3, "1d4"], ["Implosão", 3, "1d8 + @formulacao"], ["Projetar", 4],
      ["Revelar", 1], ["Transmutar", 3], ["Transpassar", 3, "1d10 + @formulacao"]]
  },
  naturalista: {
    forms: [["Chicote", 1, "5 m", "1"], ["Toque", 1, "Toque", "1"],
      ["Névoa", 4, "5 m", "Múltiplos"], ["Revestir", 2, "10 m", "1"], ["Pulso", 3, "Próprio", "Múltiplos"]],
    words: [["Raízes", 2, "1d6 + @formulacao", "O alvo testa Esquiva contra Natureza para evitar Restrito."],
      ["Ceifar", 2, "1d6 + @formulacao", "Recupera metade do dano causado em PS."],
      ["Predar", 2, "", "+1d6 de dano ao ferir o alvo marcado por Instinto rodadas."],
      ["Curar", 2, "", "Recupera 1d4 + Instinto em PS, com opção de pagar por dados extras."],
      ["Acelerar", 2, "", "Aumenta Movimento em Instinto metros por Instinto rodadas."],
      ["Decompor", 2, "1d8 + @formulacao", "Reduz a Proteção do alvo em 2 por 2 rodadas. Não acumula."],
      ["Desabrochar", 3, "", "Cura 1d4 PS por rodada, durante Instinto rodadas."],
      ["Camuflar", 1, "", "Concede 1 Trunfo no próximo teste de Furtividade."]]
  },
  cruzado: {
    forms: [["Escudo", 3, "Próprio", "Área"], ["Investida Alada", 3, "10 m", "1"]],
    words: [["Desafiar", 2], ["Interpor", 3], ["Punir", 3], ["Sentenciar", 4, "2d12 + @formulacao"]]
  },
  sacerdote: {
    forms: [["Sussurro", 4, "30 m", "1"], ["Abrigo", 4, "Próprio", "Área"],
      ["Aura Superior", 4, "20 m", "Até 3"], ["Farol", 2, "25 m", "1"]],
    words: [["Inspirar", 4], ["Alívio", 3], ["Arma Espiritual", 3], ["Cura Superior", 3],
      ["Preservar", 3], ["Purificar", 4, "2d8 + @formulacao"]]
  },
  feiticeiro: {
    forms: [["Disparo Superior", 1, "10 m", "1"], ["Erupção", 4, "15 m", "Múltiplos"],
      ["Feixe", 4, "15 m", "Múltiplos"], ["Precipitação", 6, "20 m", "Múltiplos"]],
    words: [["Derreter", 3], ["Ecoar", 2], ["Infusão", 3], ["Inverter", 4], ["Romper", 3], ["Singularidade", 6]]
  },
  mago: {
    forms: [["Disparo Superior", 1, "10 m", "1"], ["Esfera", 5, "10 m", "Múltiplos"],
      ["Fenda", 3, "15 m", "1"], ["Foco", 4, "10 m", "1"]],
    words: [["Desfazer", 4], ["Distorcer", 2], ["Elemento Superior", 2], ["Escudo", 3],
      ["Permutar", 4], ["Prisão", 3], ["Repelir", 3]]
  },
  pactuado: {
    forms: [["Disparo Superior", 1, "10 m", "1"], ["Corrente", 4, "5 m", "2"],
      ["Artéria", 3, "10 m", "Área"], ["Espasmo", 2, "Próprio", ""]],
    words: [["Alimentar", 2], ["Coagular", 3], ["Contagiar", 3], ["Exumar", 2], ["Gangrena", 5], ["Lacerar", 3]]
  },
  xama: {
    forms: [["Totem", 4, "10 m", "1"], ["Chuva", 3, "10 m", "Área"], ["Chicote Aprimorado", 2, "15 m", "1"]],
    words: [["Espinhos", 3, "2d8 + @formulacao", "Terreno difícil. Inimigos que iniciam o turno na área ficam Restritos."],
      ["Possuir", 3, "", "Requer Invocação ativa. Aplica 1 Fardo no próximo Ataque e −2 de Defesa até o fim do próximo turno do Xamã."],
      ["Terremoto", 5, "3d10 + @formulacao", "Os alvos testam Resistência para evitar Caído."],
      ["Banquete", 4, "", "Aliados na Forma recuperam 1d8 PS no início dos próprios turnos por Instinto rodadas."],
      ["Etéreo", 3, "", "Aliados ficam Etéreos até o início do próximo turno e recebem +3 m de Movimento."]]
  }
};
export const AMPLIFICATIONS = [
  ["Condição", 3], ["Direcionar", 2], ["Duradoura", 2], ["Intensa", 2], ["Precisa", 1],
  ["Silenciosa", 1], ["Aumentada", 4, true], ["Especialista", 5, true], ["Múltipla", 6, true], ["Rápida", 4, true]
];

const DEFAULT_ICONS = {
  arma: "sword", armadura: "shield", equipamento: "item-bag",
  formulacao: "book", proeza: "book", traco: "upgrade", classe: "book", script: "item-bag"
};

export function itemIcon(item) {
  const folder = `${PATH}/assets/icons/`;
  const legacy = [`icons/svg/${DEFAULT_ICONS[item.type]}.svg`, "icons/svg/mystery-man.svg", "icons/svg/item-bag.svg"];
  if (item.img && !item.img.startsWith(folder) && !legacy.includes(item.img)) return item.img;
  const findIcon = value => {
    const name = (value ?? "").normalize("NFD").replace(/\p{Diacritic}/gu, "").toLowerCase().trim();
    return RECORD_ICONS[`${item.type}:${name}`];
  };
  const spellIcon = item.type === "formulacao" && (findIcon(item.system?.palavra) ?? findIcon(item.system?.forma));
  const fallback = Object.hasOwn(DEFAULT_ICONS, item.type) ? item.type : "equipamento";
  return folder + (findIcon(item.name) || spellIcon || `${fallback}.svg`);
}

export const aptitudeIcon = key => `${PATH}/assets/icons/aptidao-${key}.svg`;
