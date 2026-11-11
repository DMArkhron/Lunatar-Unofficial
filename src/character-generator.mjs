import { PATH, SYSTEM, SCALE, ATTRIBUTES, SKILLS, CLASSES, ORIGINS, MOONS,
  defenseBase, healthBase, magicBase } from "./rules.mjs";
import { ORIGIN_TRAITS, ORIGIN_FEATS, CLASS_FEATS, NATURE_TRAITS } from "./features.mjs";
import { serialize } from "./actions.mjs";

const attributeKeys = Object.keys(ATTRIBUTES);
const skillKeys = Object.keys(SKILLS);
const attributeSlots = [4, 3, 2, 2, 1, 1, 1, 1];
const skillSlots = [4, 4, 3, 3, 3, 2, 2, 2, 2, 1, 1, 1, 1, 1, ...Array(skillKeys.length - 14).fill(0)];
const options = (values, current) => Object.entries(values).map(([id, label]) => ({
  id, label, selected: id === String(current ?? "")
}));
const choices = (rows, current) => rows.map(([label, description], id) => ({ id, label, description, selected: String(id) === current }));
const featChoices = (rows, current) => choices(rows.map(([name, _action, _cost, description]) => [name, description]), current);
const pickOptions = (keys, current) => options(Object.fromEntries(keys.map(key => [key, ATTRIBUTES[key]])), current);
const religions = [
  ["Luminismo", "Valorize a Luz e proteja os inocentes.", "Sempre há Luz", "Como ação livre, pode iluminar até 15 m a partir de um objeto."],
  ["Noxismo", "Busque a verdade e o controle, conforme o Dogma de Mórfyrus.", "Ver a verdade", "Uma vez por cena, enxerga através da escuridão, inclusive mágica. Recebe 1 Trunfo em testes contra Cego."],
  ["Remanescentes", "Preserve os Costumes Antigos, liberte os oprimidos e se oponha à tirania.", "Familiar à estranheza", "Refaça testes contra Medo, Restrito ou Imobilizado com 1 Trunfo, mantendo o novo resultado."]
];
const techniques = [
  ["Arma Pesada", "Com uma arma pesada empunhada com as duas mãos, soma metade do nível ao dano e concede Bruta 1 ou aumenta Bruta em 1."],
  ["Arqueiro", "Armas à distância ganham Ágil, ignoram Recarga e somam metade do nível ao dano."],
  ["Defesa", "Com arma em uma mão e escudo na outra, soma metade do nível à Proteção, com mínimo 1. A Defesa concedida pelo escudo aumenta em 1."],
  ["Duas Armas", "Com duas armas leves ou uma média e uma leve, faz um ataque extra na mesma ação sem o Fardo desse ataque, com usos por cena iguais à Destreza. As armas usadas com a técnica recebem Ágil."]
];
const priorities = {
  adepto: [["presenca", "corpo", "instinto", "personalidade"], ["teurgia", "ataqueMagico", "ataque", "resistencia", "intuicao"]],
  combatente: [["forca", "corpo", "agilidade", "destreza"], ["ataque", "resistencia", "esquiva", "iniciativa", "atletismo"]],
  mistico: [["inteligencia", "corpo", "agilidade", "instinto"], ["misticismo", "ataqueMagico", "saber", "ocultismo", "esquiva"]],
  naturalista: [["instinto", "corpo", "destreza", "agilidade"], ["natureza", "ataqueMagico", "sobrevivencia", "pontaria", "intuicao"]],
  renegado: [["destreza", "agilidade", "instinto", "personalidade"], ["furtividade", "pontaria", "esquiva", "iniciativa", "ladroagem"]]
};
const assignSlots = (keys, preferred, slots) =>
  Object.fromEntries([...new Set([...preferred, ...keys])].map((key, index) => [key, slots[index]]));
const stages = [
  ["identity", "Origem", "fa-compass"],
  ["class", "Classe", "fa-book-open"], ["attributes", "Características", "fa-person"],
  ["skills", "Aptidões", "fa-dice-d20"], ["review", "Revisão", "fa-clipboard-check"]
];
const extras = {
  adepto: ["Religião", religions],
  combatente: ["Técnica de Combate", techniques],
  naturalista: ["Trilha da Natureza", Object.values(NATURE_TRAITS)]
};
const baseClasses = Object.fromEntries(Object.entries(CLASSES).map(([id, data]) => [id, data.label]));
const origins = Object.fromEntries(Object.entries(ORIGINS).map(([id, [label]]) => [id, label]));
const classGuides = {
  adepto: "Fé, dogmas e magia divina.", combatente: "Armas, defesa e técnicas de combate.",
  mistico: "Formas, Palavras e magia lunar.", naturalista: "Natureza, caça e sobrevivência.",
  renegado: "Astúcia, precisão e mobilidade."
};
const skillLabels = Object.fromEntries(skillKeys.map(id => [id, SKILLS[id][0]]));

function shuffled(values) {
  const result = [...values];
  for (let i = result.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [result[i], result[j]] = [result[j], result[i]];
  }
  return result;
}

function budget(keys, slots, values, labels) {
  return [...new Set(slots)].map(value => ({
    label: labels[value], used: keys.filter(key => values[key] === String(value)).length,
    max: slots.filter(slot => slot === value).length
  }));
}

const statBudget = values => budget(attributeKeys, attributeSlots, values, ["", "1", "2", "3", "4"]);
const skillBudget = values => budget(skillKeys, skillSlots, values, SCALE.map(die => `d${die}`));
const complete = rows => rows.every(({ used, max }) => used === max);
const validChoice = (rows, value) => /^[0-9]+$/.test(value ?? "") && Object.hasOwn(rows, value);

export function isValid(step, values, identity) {
  switch (step) {
    case "identity": {
      if (!values.name?.trim() || values.name.trim().length > 100
        || !Object.hasOwn(ORIGINS, values.origin) || !Object.hasOwn(CLASSES, values.classe)) return false;
      const origin = ORIGINS[values.origin];
      return origin[2].includes(values.first) && origin[3].includes(values.second) && values.first !== values.second
        && validChoice(ORIGIN_FEATS[values.origin], values.feature);
    }
    case "class": return validChoice(CLASS_FEATS[identity.classe], values.classFeature)
      && (!extras[identity.classe] || validChoice(extras[identity.classe][1], values.extra));
    case "attributes": return complete(statBudget(values));
    case "skills": return complete(skillBudget(values)) && (identity.origin !== "humano"
      || values.humanTrait === "proposito"
      || (values.humanTrait === "versatil" && Object.hasOwn(SKILLS, values.versatil) && values[values.versatil] === "0"));
    default: return true;
  }
}

function bindStep(dialog, step, identity, suggested) {
  const root = dialog.element.querySelector(".ln-wizard");
  const form = root.closest("form");
  const fields = form.elements;
  const read = () => Object.fromEntries(new FormData(form));
  const next = dialog.element.querySelector('[data-action="next"]');
  const message = root.querySelector("[data-step-message]");
  const refresh = () => {
    const selectedOrigin = root.querySelector('input[name="origin"]:checked')?.value;
    for (const panel of root.querySelectorAll("[data-origin-panel]")) {
      const active = panel.dataset.originPanel === selectedOrigin;
      panel.hidden = !active;
      for (const control of panel.querySelectorAll("select, input")) control.disabled = !active;
    }
    const first = root.querySelector('[data-origin-panel]:not([hidden]) [name="first"]');
    const second = root.querySelector('[data-origin-panel]:not([hidden]) [name="second"]');
    if (first && second) {
      for (const option of second.options) option.disabled = option.value === first.value;
      if (second.selectedOptions[0]?.disabled) second.value = [...second.options].find(option => !option.disabled)?.value ?? "";
    }
    const versatile = fields.namedItem("versatil");
    if (versatile) {
      const available = skillKeys.filter(key => fields.namedItem(key).value === "0");
      versatile.disabled = fields.namedItem("humanTrait").value === "proposito";
      for (const option of versatile.options) option.disabled = !available.includes(option.value);
      if (!available.includes(versatile.value)) versatile.value = available[0] ?? "";
    }
    for (const detail of root.querySelectorAll("[data-choice-detail]")) {
      const option = root.querySelector(`[data-origin-panel]:not([hidden]) [name="${detail.dataset.choiceDetail}"]`)?.selectedOptions[0]
        ?? fields.namedItem(detail.dataset.choiceDetail)?.selectedOptions?.[0];
      detail.textContent = option?.dataset.description ?? "";
    }
    const values = read();
    const counter = root.querySelector("[data-budget]");
    if (counter) {
      const rows = step === "attributes" ? statBudget(values) : skillBudget(values);
      counter.replaceChildren(...rows.map(({ label, used, max }) => {
        const chip = document.createElement("span");
        chip.className = `ln-budget-chip ${used === max ? "complete" : used > max ? "over" : ""}`;
        chip.textContent = `${label}  ${used}/${max}`;
        return chip;
      }));
      counter.classList.toggle("ln-invalid", !complete(rows));
    }
    for (const output of root.querySelectorAll("[data-final-attribute]")) {
      const key = output.dataset.finalAttribute;
      output.textContent = Number(values[key]) + Number(suggested.bonuses.includes(key));
    }
    const valid = isValid(step, values, identity);
    if (next) next.disabled = !valid;
    message.hidden = valid;
  };
  root.addEventListener("input", refresh);
  root.addEventListener("change", refresh);
  for (const button of root.querySelectorAll("[data-distribution]")) {
    button.addEventListener("click", () => {
      const keys = step === "attributes" ? attributeKeys : skillKeys;
      const slots = step === "attributes" ? attributeSlots : skillSlots;
      const values = button.dataset.distribution === "shuffle" ? shuffled(slots) : keys.map(key => suggested[key]);
      keys.forEach((key, index) => { fields.namedItem(key).value = String(values[index]); });
      refresh();
    });
  }
  refresh();
}

function buildItems(initial, result, extraRows) {
  const origin = ORIGINS[initial.origin][0];
  const klass = CLASSES[initial.classe].label;
  const trait = ([name, descricao], origem) => ({ type: "traco", name, system: { origem, descricao } });
  const feat = ([name, tipoAcao, custoAcao, descricao], fonte) =>
    ({ type: "proeza", name, system: { fonte, tipoAcao, custoAcao, descricao } });
  const originTrait = result.humanTrait === "proposito"
    ? ["Propósito", "O Azular recebe um Trunfo. Combine com o mestre como aplicá-lo."]
    : ORIGIN_TRAITS[initial.origin];
  const items = [
    trait(originTrait, origin),
    feat(ORIGIN_FEATS[initial.origin][result.feature], origin),
    feat(CLASS_FEATS[initial.classe][result.classFeature], klass)
  ];
  const extra = extraRows[result.extra];
  if (initial.classe === "adepto") {
    const [religion, dogma, name, description] = extra;
    items.push(trait([name, `${dogma} ${description}`], religion),
      trait(["Acesso à Magia", "O Adepto pode usar as Formas e Palavras de sua lista enquanto seguir seu Dogma."], klass));
  }
  if (["combatente", "naturalista"].includes(initial.classe)) items.push(trait(extra, klass));
  if (initial.classe === "mistico") items.push(trait(["Sintonia Lunar",
    "Concede acesso a todas as Formas e Palavras da lista do Místico."], klass));
  if (initial.classe === "renegado") items.push(trait(["Ataque Preciso",
    "No primeiro ataque bem-sucedido do turno, cause +1d6 se houver ao menos 1 Trunfo ou se o alvo estiver vulnerável, conforme p. 51."], klass));
  return items.map(item => ({ ...item, flags: { [SYSTEM]: { fromGenerator: true } } }));
}

function resultFor(draft, actor) {
  const initial = draft.identity;
  const result = { ...draft.identity, ...draft.class, ...draft.attributes, ...draft.skills };
  const caracteristicas = Object.fromEntries(attributeKeys.map(key => [
    key, Number(result[key]) + Number(key === result.first || key === result.second)
  ]));
  const aptidoes = Object.fromEntries(skillKeys.map(key => [key, Number(result[key])]));
  if (initial.origin === "humano" && result.humanTrait === "versatil") aptidoes[result.versatil] = 2;
  const system = {
    nivel: 1, classe: initial.classe, origem: initial.origin, trilha: "",
    trilhaNatureza: initial.classe === "naturalista" ? Object.keys(NATURE_TRAITS)[result.extra] : "",
    caracteristicas, aptidoes
  };
  const hp = actor?.system.manual?.saude ?? Math.max(1, healthBase(system) + (actor?.system.ajuste?.saude ?? 0));
  const mp = actor?.system.manual?.magia ?? Math.max(0, magicBase(system) + (actor?.system.ajuste?.magia ?? 0));
  system.saude = { value: hp };
  system.magia = { value: mp };
  const items = buildItems(initial, result, extras[initial.classe]?.[1] ?? []);
  return { name: initial.name.trim(), system, items };
}

export function stageContext(step, draft, actor) {
  const identity = draft.identity;
  const saved = draft[step] ?? {};
  const context = { [step]: true, originLabel: origins[identity.origin], classLabel: baseClasses[identity.classe] };
  const suggested = {};
  switch (step) {
    case "identity":
      return { context: { ...context, name: identity.name,
        origins: options(origins, identity.origin).map(option => ({ ...option,
          description: ORIGIN_TRAITS[option.id][1].slice(0, 110) })),
        classes: options(baseClasses, identity.classe).map(option => ({ ...option, description: classGuides[option.id] })),
        originPanels: Object.entries(ORIGINS).map(([id, origin]) => ({ id, label: origin[0],
          traitName: ORIGIN_TRAITS[id][0], traitDescription: ORIGIN_TRAITS[id][1], movement: origin[1],
          first: pickOptions(origin[2], saved.first), second: pickOptions(origin[3], saved.second),
          features: featChoices(ORIGIN_FEATS[id], saved.feature) })) }, suggested };
    case "class": {
      const [extraLabel, rows] = extras[identity.classe] ?? ["", []];
      return { context: { ...context, extraLabel, extra: choices(rows, saved.extra),
        features: featChoices(CLASS_FEATS[identity.classe], saved.classFeature) }, suggested };
    }
    case "attributes": {
      const preferred = priorities[identity.classe][0];
      Object.assign(suggested, assignSlots(attributeKeys, preferred, attributeSlots));
      suggested.bonuses = [draft.identity.first, draft.identity.second];
      return { context: { ...context, priorities: preferred.slice(0, 2).map(id => ATTRIBUTES[id]).join(" e "),
        stats: attributeKeys.map(id => ({ id, label: ATTRIBUTES[id], bonus: suggested.bonuses.includes(id),
          values: options({ 1: 1, 2: 2, 3: 3, 4: 4 }, saved[id] ?? suggested[id]) })) }, suggested };
    }
    case "skills": {
      const preferred = priorities[identity.classe][1];
      Object.assign(suggested, assignSlots(skillKeys, preferred, skillSlots));
      return { context: { ...context, human: identity.origin === "humano",
        priorities: preferred.slice(0, 2).map(id => skillLabels[id]).join(" e "),
        skills: skillKeys.map(id => ({ id, label: skillLabels[id],
          values: options(SCALE.slice(0, 5).map(die => `d${die}`), saved[id] ?? suggested[id]) })),
        humanTraits: options({ versatil: "Versátil", proposito: "Propósito (Azular)" }, saved.humanTrait),
        versatile: options(skillLabels, saved.versatil) }, suggested };
    }
    case "review": {
      const { name, system, items } = resultFor(draft, actor);
      return { context: { ...context, name, items, existing: Boolean(actor),
        hp: system.saude.value, mp: system.magia.value,
        defense: defenseBase({ ...system, defAtributo: actor?.system.defAtributo }, "def"),
        magicDefense: defenseBase({ ...system, wardAtributo: actor?.system.wardAtributo }, "ward"),
        stats: attributeKeys.map(id => ({ label: ATTRIBUTES[id], value: system.caracteristicas[id] })),
        training: [4, 3, 2, 1].map(rank => ({ die: `d${SCALE[rank]}`,
          skills: skillKeys.filter(id => system.aptidoes[id] === rank).map(id => SKILLS[id][0]).join(", ") })),
        moon: MOONS[(actor?.system.lua ?? 0) - 1], rollMoon: !draft.review || draft.review.lua === "on"
      }, suggested };
    }
  }
}

async function generate(actor) {
  const draft = { identity: { name: actor?.name ?? "", origin: actor?.system.origem, classe: actor?.system.classe } };
  let index = 0;
  while (index < stages.length) {
    const [step, label] = stages[index];
    const { context, suggested } = stageContext(step, draft, actor);
    const content = await foundry.applications.handlebars.renderTemplate(`${PATH}/templates/character-wizard.hbs`, {
      ...context, label, progressPercent: Math.round(((index + 1) / stages.length) * 100),
      progress: stages.map(([, name, icon], i) => ({ name, icon, current: i === index, done: i < index }))
    });
    const read = direction => (_event, button) => ({ direction, values: Object.fromEntries(new FormData(button.form)) });
    const buttons = [];
    if (index > 0) buttons.push({ action: "back", label: "Voltar", callback: read(-1) });
    buttons.push({ action: "next", label: step === "review" ? (actor ? "Aplicar à ficha" : "Criar personagem") : "Continuar",
      default: true, callback: read(1) });
    const response = await foundry.applications.api.DialogV2.wait({
      classes: ["lunatar", "lunatar-roll-dialog", "lunatar-generator"], position: { width: 720 },
      window: { title: `Gerador de Personagem · ${index + 1} de ${stages.length}` },
      content, buttons, modal: true, rejectClose: false,
      render: (_event, dialog) => bindStep(dialog, step, draft.identity, suggested)
    });
    if (!response) return;
    const { direction, values } = response;
    const previous = draft[step];
    draft[step] = values;
    if (step === "identity") {
      if (previous.origin !== values.origin) {
        delete draft.attributes;
        delete draft.skills?.humanTrait;
        delete draft.skills?.versatil;
      }
      if (previous.classe !== values.classe) {
        delete draft.class;
        delete draft.attributes;
        delete draft.skills;
      }
    }
    if (direction > 0 && !isValid(step, values, draft.identity)) continue;
    index += direction;
  }

  const { name, system, items } = resultFor(draft, actor);
  if (draft.review.lua === "on" && !actor?.system.lua) system.lua = (await new foundry.dice.Roll("1d12").evaluate()).total;
  if (!actor) {
    const created = await foundry.documents.Actor.create({ name, type: "personagem", system, items });
    if (created) {
      ui.notifications.info(`${created.name} foi criado no nível 1.`);
      await created.sheet?.render({ force: true });
    }
    return created;
  }
  await serialize(actor, async () => {
    const sameItem = (left, right) => left.type === right.type && left.name === right.name
      && (left.type === "traco" ? left.system.origem === right.system.origem : left.system.fonte === right.system.fonte);
    const missing = items.filter(candidate => !actor.items.some(item => sameItem(candidate, item)));
    const obsolete = actor.items.filter(item => item.getFlag(SYSTEM, "fromGenerator")
      && !items.some(candidate => sameItem(candidate, item)));
    if (missing.length) await actor.createEmbeddedDocuments("Item", missing);
    await actor.update({ name, system });
    if (obsolete.length) await actor.deleteEmbeddedDocuments("Item", obsolete.map(item => item.id));
  });
  ui.notifications.info("Ficha atualizada para o nível 1.");
  return actor;
}

let open = false;

export async function buildCharacter(actor) {
  const Actor = foundry.documents.Actor;
  if (open || (actor ? !actor.isOwner || actor.type !== "personagem" : !Actor.canUserCreate(game.user))) return;
  open = true;
  try { return await generate(actor); }
  finally { open = false; }
}

export function addGeneratorButton(_directory, element) {
  if (!foundry.documents.Actor.canUserCreate(game.user) || element.querySelector(".ln-open-generator")) return;
  const header = element.querySelector(".directory-header");
  if (!header) return;
  const button = document.createElement("button");
  button.type = "button";
  button.className = "ln-open-generator";
  const icon = document.createElement("i");
  icon.className = "fa-solid fa-wand-magic-sparkles";
  icon.setAttribute("aria-hidden", "true");
  button.append(icon, " Gerador de Personagem");
  button.addEventListener("click", () => buildCharacter().catch(error => {
    console.error("Lunatar |", error);
    ui.notifications.warn(error.message);
  }));
  header.append(button);
}
