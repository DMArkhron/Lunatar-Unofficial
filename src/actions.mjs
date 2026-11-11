import { equipmentSlots, equippedAt } from "./equipment.mjs";
import { SYSTEM, PATH, SCALE, ATTRIBUTES, CONCRETE, SKILLS, CLASSES, MOONS, clamp, outcome, testSpec, rankLimit } from "./rules.mjs";

import { postRoll, postRollBundle, postCard, chatModeOptions, defaultChatMode, publicChatMode } from "./chat.mjs";

const { Roll } = foundry.dice;

export const attributeFor = (actor, skill) => SKILLS[skill]?.[1]
  || CLASSES[actor.system.classe]?.form || actor.system.formulacaoAtributo || "instinto";

export const actorModifier = (actor, key) => actor.type === "personagem"
  ? actor.system.caracteristicas[key] : (CONCRETE.includes(key) ? actor.system.concreto : actor.system.abstrato);

export async function prompt(title, template, context, label, presentation = {}) {
  const content = await foundry.applications.handlebars.renderTemplate(`${PATH}/templates/${template}.hbs`, context);
  return foundry.applications.api.DialogV2.prompt({
    ...presentation, window: { title }, content, rejectClose: false, modal: true,
    ok: { label, callback: (_event, button) => Object.fromEntries(new FormData(button.form)) }
  });
}

const queues = new Map();
export function serialize(actor, operation) {
  const key = actor.uuid;
  const pending = (queues.get(key) ?? Promise.resolve()).catch(() => {}).then(operation);
  queues.set(key, pending);
  return pending.finally(() => { if (queues.get(key) === pending) queues.delete(key); });
}

export function clearTurn(actor, turn = "") {
  return serialize(actor, () => {
    if (turn && actor.system.turno === turn) return;
    return actor.update({ "system.acoes.value": actor.system.acoes.max, "system.turno": turn,
      ...Object.fromEntries(Object.keys(actor.system.repeticoes).map(key => [`system.repeticoes.-=${key}`, null])) });
  });
}

export function inCombat(actor) {
  return Boolean(game.combat?.started && game.combat.combatants.some(combatant => combatant.actor?.uuid === actor.uuid));
}

const simpleDice = /^(?:\d{1,2}d(?:4|6|8|10|12|16|20)|\d{1,3})(?:\s*[+-]\s*(?:\d{1,2}d(?:4|6|8|10|12|16|20)|\d{1,3}))*$/i;
const changeFirstDie = (formula, countDelta, step) => formula.replace(/(\d+)d(\d+)/i, (_match, count, faces) =>
  `${Number(count) + countDelta}d${SCALE[clamp(SCALE.indexOf(Number(faces)) + step, 0, 6)]}`);

function itemDamage(actor, item, data, result) {
  const s = item?.system;
  if (!s?.dano || data.dano !== "on" || result?.success === false) return null;
  let dice = s.dano.trim().toLowerCase().replaceAll("@formulacao",
    String(actorModifier(actor, attributeFor(actor, "ataqueMagico")) ?? 0));
  if (!simpleDice.test(dice)) throw new Error("Use uma fórmula de dano como 1d8 + 2.");
  if (item.type === "arma") {
    const position = s.versatil ? equippedAt(equipmentSlots(actor), item.id) : "";
    const twoHanded = s.versatil && (position === "ambas" || (!position && data.duas === "on"));
    dice = changeFirstDie(dice, Number(Boolean(s.mortifera && result?.impulso >= 10)), Number(Boolean(twoHanded)));
    const piercing = s.perfurante && data.perfurante === "on";
    const bonus = piercing ? s.bonus : s.bonus + s.bruta
      + (s.adicionarAtributo ? actorModifier(actor, s.atributoDano) : 0);
    return { formula: `${dice} + (${bonus})`, label: piercing ? "Dano perfurante · ignora Proteção" : "Dano" };
  }
  return { formula: dice, label: "Dano da magia" };
}

function rollParameters(actor, skill, item, attribute, data) {
  const spend = data.gastar === "on";
  const cost = spend ? (item?.system.custoAcao ?? 1) : 0;
  const repeat = cost > 0 ? (actor.system.repeticoes[skill] ?? 0) : 0;
  const agile = item?.type === "arma" && skill === "ataque" && repeat === 1
    && item.system.propriedades.includes("Ágil");
  const spec = testSpec(actor, skill, {
    attribute, trumps: clamp(Math.trunc(Number(data.trunfo) || 0), 0, 2),
    burdens: Math.max(0, Math.trunc(Number(data.fardo) || 0)),
    bonus: (Number(data.bonus) || 0) - (agile ? 2 : 0),
    repeat: repeat - Number(Boolean(agile))
  });
  return { cost, repeat, spec, automatic: [
    [spec.armor, "Armadura"], [spec.half, "Meia Vida"], [spec.condition, "Condições"],
    [repeat - Number(Boolean(agile)), "Repetições"]
  ].filter(([value]) => value > 0), agile };
}

function configureRollPreview(dialog, getParameters) {
  const panel = dialog.element.querySelector(".ln-roll");
  const form = panel.closest("form");
  const die = panel.querySelector("[data-roll-die]");
  const icon = panel.querySelector("[data-roll-icon]");
  const formula = panel.querySelector("[data-roll-formula]");
  const source = panel.querySelector("[data-roll-sources]");
  const buttons = [...panel.querySelectorAll("[data-roll-step]")];
  const refresh = () => {
    const { spec, automatic, agile } = getParameters(Object.fromEntries(new FormData(form)));
    die.textContent = `d${spec.die}`;
    icon.src = [4, 6, 8, 10, 12, 20].includes(spec.die)
      ? `icons/dice/d${spec.die}black.svg` : `${PATH}/assets/d${spec.die}.svg`;
    formula.textContent = `1d${spec.die} ${spec.mod < 0 ? "−" : "+"} ${Math.abs(spec.mod)}`;
    const notes = automatic.map(([value, label]) => `${label} ${value}`);
    if (agile) notes.push("Ágil −2");
    if (spec.edge) notes.push(`Limite do dado ${spec.edge > 0 ? "+" : "−"}${Math.abs(spec.edge)}`);
    source.textContent = notes.length ? notes.join(" · ") : "Sem ajustes automáticos";
    for (const button of buttons) {
      const input = form.elements.namedItem(button.dataset.rollField);
      const next = Number(input.value) + Number(button.dataset.rollStep);
      button.disabled = next < Number(input.min) || (input.max !== "" && next > Number(input.max));
    }
  };
  for (const button of buttons) button.addEventListener("click", () => {
    const input = form.elements.namedItem(button.dataset.rollField);
    input.value = Number(input.value) + Number(button.dataset.rollStep);
    refresh();
  });
  panel.addEventListener("input", refresh);
  panel.addEventListener("change", refresh);
  refresh();
}

export async function rollTest(actor, skill, item = null) {
  if (!actor.isOwner || !Object.hasOwn(SKILLS, skill)) return;
  const s = item?.system;
  const magic = item?.type === "formulacao";
  const weapon = item?.type === "arma";
  const feature = ["proeza", "traco"].includes(item?.type);
  const targetActors = [...game.user.targets];
  const targetActor = targetActors.length === 1 ? targetActors[0].actor : null;
  const target = targetActor && (weapon || feature || (magic && s.ataqueMagico))
    ? targetActor.system[magic ? "defesaMagica" : "defesa"] : "";
  const preferred = attributeFor(actor, skill);
  const attribute = weapon && s.propriedades.includes("Elegante") && actorModifier(actor, "destreza") >= 3
    ? "destreza" : preferred;
  const label = item ? item.name : SKILLS[skill][0];
  const pc = actor.type === "personagem";
  const baseDie = SCALE[Math.min(actor.system.aptidoes[skill], pc ? rankLimit(actor.system.nivel) : 6)];
  const getParameters = data => rollParameters(actor, skill, item, attribute, data);
  const data = await prompt("Rolagem · Lunatar", "test-dialog", {
    label, actor: actor.name, skill: item ? SKILLS[skill][0] : "", attribute: ATTRIBUTES[attribute], baseDie,
    characteristic: actorModifier(actor, attribute), level: pc ? actor.system.nivel : null,
    target, modes: chatModeOptions(), magic, damage: Boolean(s?.dano),
    trumps: magic ? clamp(s.trunfos, 0, 2) : 0, cost: s?.custoAcao ?? 1, spend: inCombat(actor) && skill !== "iniciativa",
    pm: magic ? s.custoForma + s.custoPalavra + s.custoExtra : 0,
    reflex: s?.reflexo ?? 0, piercing: s?.perfurante, versatile: s?.versatil && !equippedAt(equipmentSlots(actor), item.id),
    lunar: pc && actor.system.dadoLunar > 0
  }, "Rolar teste", { classes: ["lunatar", "lunatar-roll-dialog"], position: { width: 485 },
    render: (_event, dialog) => configureRollPreview(dialog, getParameters) });
  if (!data) return;
  return serialize(actor, async () => {
    const a = actor.system;
    const { cost, repeat, spec, automatic } = getParameters(data);
    const pm = magic ? s.custoForma + s.custoPalavra + s.custoExtra : 0;
    if (magic && (!s.forma.trim() || (!s.palavra.trim() && !s.dano.trim()))) {
      throw new Error("Preencha a Forma e a Palavra, ou registre o dano de uma Forma que dispensa Palavra.");
    }
    if (pm > a.magia.value) throw new Error("PM insuficientes.");
    if (feature && s.maxUsos && !s.usos) throw new Error("Não há usos disponíveis.");
    if (cost > a.acoes.value) throw new Error("Ações insuficientes.");
    if (data.lunar && !a.dadoLunar) throw new Error("Nenhum Dado Lunar disponível.");
    const na = data.na === "" ? null : Number(data.na);
    const mode = data.modo || defaultChatMode();
    let roll = await new Roll(spec.formula).evaluate();
    const original = roll.total;
    const useLunar = data.lunar && await foundry.applications.api.DialogV2.confirm({
      window: { title: "Usar Dado Lunar?" }, modal: true, rejectClose: false,
      content: `<p>O primeiro resultado foi <strong>${original}</strong>. A nova rolagem substitui esse resultado.</p>`
    });
    if (useLunar) roll = await new Roll(spec.formula).evaluate();
    const result = outcome(roll.total, na, data.tipo === "oposto", game.settings.get(SYSTEM, "empate"));
    const damage = itemDamage(actor, item, data, result);
    const damageRoll = damage && await new Roll(damage.formula).evaluate();
    const reflex = magic && s.reflexo > 0 && await new Roll(`${s.reflexo}d4`).evaluate();
    const updates = {};
    if (cost > 0) {
      updates["system.acoes.value"] = a.acoes.value - cost;
      updates[`system.repeticoes.${skill}`] = repeat + 1;
    }
    if (useLunar) updates["system.dadoLunar"] = a.dadoLunar - 1;
    if (pm) updates["system.magia.value"] = a.magia.value - pm;
    if (reflex) updates["system.saude.value"] = Math.max(0, a.saude.value - reflex.total);
    if (Object.keys(updates).length) await actor.update(updates);
    if (feature && s.maxUsos) await item.update({ "system.usos": s.usos - 1 });
    const metrics = [
      { label: magic ? "Teste de magia" : weapon ? "Acerto" : "Teste", value: roll.total },
      ...(damageRoll ? [{ label: damage.label, value: damageRoll.total }] : []),
      ...(reflex ? [{ label: "Reflexo", value: reflex.total }] : []),
      ...(result ? [
      { label: data.tipo === "oposto" ? "Oposição" : "Número-Alvo", value: na },
      { label: "Impulso", value: result.impulso }, { label: "Recuo", value: result.recuo }
      ] : [])
    ];
    const details = [];
    if (automatic.length) details.push("Fardos automáticos · " + automatic.map(([value, source]) => `${source} ${value}`).join(" · "));
    if (useLunar) details.push(`Dado Lunar · total anterior ${original}`);
    if (magic) {
      const words = [s.palavra, s.palavraExtra].filter(Boolean);
      details.push([s.forma, ...words, s.ampliacao].filter(Boolean).join(" + ") + ` · ${pm} PM`);
      if (s.descricao) details.push(s.descricao);
    }
    await postRollBundle(actor, [
      { roll, label: magic ? "Teste de magia" : weapon ? "Acerto" : "Teste" },
      ...(damageRoll ? [{ roll: damageRoll, label: damage.label }] : []),
      ...(reflex ? [{ roll: reflex, label: "Reflexo · dano ao conjurador" }] : [])
    ], {
      kind: magic ? "spell" : weapon ? "attack" : feature ? (item.type === "traco" ? "trait" : "feat") : "skill", title: label,
      subtitle: item ? `${SKILLS[skill][0]} · ${ATTRIBUTES[attribute]}` : ATTRIBUTES[attribute],
      status: result ? (result.success ? "Sucesso" : "Falha") : "Sem Número-Alvo",
      ...(result ? { success: result.success } : {}), metrics, detail: details.join("\n")
    }, mode);
    return roll;
  });
}

export async function useFeature(actor, item) {
  const s = item.system;
  if (s.dano?.trim() && ["proeza", "traco"].includes(item.type)) return rollTest(actor, s.aptidao || "ataque", item);
  return serialize(actor, async () => {
    const costs = item.type === "traco" || (item.type === "proeza"
      && ["Ação", "Reação", "Ação ou Reação", "Ação e Reação"].includes(s.tipoAcao));
    const cost = costs && inCombat(actor) ? (s.custoAcao ?? 0) : 0;
    if (cost > actor.system.acoes.value) throw new Error("Ações insuficientes.");
    if (s.maxUsos && !s.usos) throw new Error("Não há usos disponíveis.");
    const uses = s.usos;
    if (s.maxUsos) await item.update({ "system.usos": uses - 1 });
    try {
      if (cost) await actor.update({ "system.acoes.value": actor.system.acoes.value - cost });
    } catch (error) {
      if (s.maxUsos) await item.update({ "system.usos": uses });
      throw error;
    }
    return postCard(actor, { kind: ({ proeza: "feat", traco: "trait", equipamento: "gear" })[item.type], title: item.name,
      subtitle: s.tipoAcao || s.origem || (item.type === "equipamento" ? `Quantidade ${s.quantidade}` : ""),
      metrics: cost ? [{ label: "Ações gastas", value: cost }] : [], detail: s.descricao });
  });
}

export async function changeHealth(actor) {
  const data = await prompt("Ajustar Saúde", "health-dialog", { protection: actor.system.protecao }, "Aplicar");
  if (!data) return;
  return serialize(actor, () => {
    const s = actor.system;
    const amount = Math.max(0, Number(data.amount) || 0);
    const delta = data.type === "heal" ? amount
      : -Math.max(0, amount - (data.type === "damage" ? s.protecao : 0));
    return actor.update({ "system.saude.value": clamp(s.saude.value + delta, 0, s.saude.max) });
  });
}

export function rest(actor, complete) {
  return serialize(actor, async () => {
    const s = actor.system;
    const bonus = complete ? s.nivel : 0;
    const hp = Math.min(s.saude.max, s.saude.value + s.caracteristicas.corpo + bonus);
    const pm = Math.min(s.magia.max, s.magia.value + s.caracteristicas.instinto + bonus);
    await actor.update({ "system.saude.value": hp, "system.magia.value": pm });
    if (complete) {
      const uses = actor.items.filter(item => item.type === "proeza" && item.system.recuperar && item.system.maxUsos)
        .map(item => ({ _id: item.id, "system.usos": item.system.maxUsos }));
      if (uses.length) await actor.updateEmbeddedDocuments("Item", uses);
    }
  });
}

export async function sign(actor) {
  const roll = await new Roll("1d12").evaluate();
  await actor.update({ "system.lua": roll.total });
  return postRoll(actor, roll, { kind: "lunar", title: MOONS[roll.total - 1], subtitle: "Lua do personagem" });
}

export async function newLunarCycle({ replenish = true } = {}) {
  if (!game.user.isGM) throw new Error("Apenas o mestre pode iniciar um ciclo lunar.");
  const count = (await new Roll("1d4").evaluate()).total;
  const moons = new Set();
  while (moons.size < count) moons.add((await new Roll("1d12").evaluate()).total);
  await game.settings.set(SYSTEM, "luas", [...moons]);
  if (replenish) {
    const actors = game.actors.filter(actor => actor.type === "personagem" && actor.hasPlayerOwner);
    if (actors.length) await foundry.documents.Actor.updateDocuments(actors.map(actor => ({
      _id: actor.id, "system.dadoLunar": moons.has(actor.system.lua) ? 2 : 1
    })));
  }
  await postCard(null, { kind: "lunar", title: "Caos Celestial", subtitle: "Luas no céu",
    detail: [...moons].map(index => MOONS[index - 1]).join(" · ") }, publicChatMode());
  return [...moons];
}
