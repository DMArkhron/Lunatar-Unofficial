import { SLOT_LABELS, equipmentOptions, equipmentSlots, equippedAt, assignEquipment } from "./equipment.mjs";
import { CLASSES, SKILLS } from "./rules.mjs";
import { changeHealth, clearTurn, newLunarCycle, prompt, rest, rollTest, serialize, sign, useFeature } from "./actions.mjs";

export async function chooseClass(actor, { classe, trilha = "", clear = false }) {
  if (actor.type !== "personagem" || !actor.isOwner || !Object.hasOwn(CLASSES, classe)) {
    throw new Error("Escolha uma classe válida para um personagem que você controla.");
  }
  const entry = CLASSES[classe];
  const validate = () => {
    if (clear && actor.system.classe !== classe) throw new Error("A classe básica mudou. Abra a ficha novamente.");
    if (trilha && (!Object.hasOwn(entry.paths, trilha) || actor.system.nivel < 5 || actor.system.classe !== classe)) {
      throw new Error(`A classe superior exige nível 5 e classe básica ${entry.label}.`);
    }
  };
  const unchanged = () => actor.system.classe === classe
    && (!trilha && !clear || (actor.system.trilha ?? "") === trilha);
  validate();
  if (unchanged()) return;
  const title = clear ? "Limpar a Classe Superior?" : `Escolher ${trilha ? entry.paths[trilha][0] : entry.label}?`;
  const content = clear ? "<p>O personagem volta a seguir a progressão da Classe Básica.</p>"
    : trilha ? "<p>A Classe Superior será usada na progressão. A Classe Básica permanece ativa.</p>"
    : "<p>Trocar a Classe Básica limpa a Classe Superior anterior.</p>";
  const ok = await foundry.applications.api.DialogV2.confirm({
    window: { title }, rejectClose: false, modal: true, content
  });
  if (!ok) return;
  return serialize(actor, () => {
    validate();
    if (unchanged()) return;
    const changes = { "system.classe": classe, "system.trilha": trilha };
    if (actor.system.classe !== classe) changes["system.trilhaNatureza"] = "";
    return actor.update(changes);
  });
}

export async function equipItem(item) {
  const actor = item?.parent;
  if (!actor?.isOwner || actor.documentName !== "Actor") return;
  const options = equipmentOptions(item);
  if (!options.length) return;
  const slots = equipmentSlots(actor);
  const preferred = equippedAt(slots, item.id) || options.find(slot =>
    slot === "ambas" ? !slots.esquerda && !slots.direita : !slots[slot]) || options[0];
  const entries = [...options, ""].map(id => ({
    id, label: SLOT_LABELS[id] ?? "Guardar no inventário", selected: id === preferred
  }));
  const data = await prompt("Equipar · " + item.name, "equipment-dialog", { entries }, "Aplicar");
  if (typeof data?.position !== "string") return;
  return serialize(actor, () => {
    const attached = actor.items.get(item.id);
    if (!attached || !actor.isOwner) return;
    const slots = assignEquipment(equipmentSlots(actor), attached, data.position);
    return actor.update({ "system.equipagem": { ...slots, configurada: true } });
  });
}

export async function useItem(item) {
  const actor = item?.parent;
  if (!actor?.isOwner || actor.documentName !== "Actor") throw new Error("Anexe o item a um personagem que você controla.");
  const s = item.system;
  switch (item.type) {
    case "arma": return rollTest(actor, s.aptidao, item);
    case "formulacao":
      return rollTest(actor, s.ataqueMagico ? "ataqueMagico" : (CLASSES[actor.system.classe]?.cast ?? "misticismo"), item);
    case "armadura": return equipItem(item);
    case "classe": return chooseClass(actor, s);
    default: return useFeature(actor, item);
  }
}

function controlledActor(characterOnly) {
  const controlled = globalThis.canvas?.tokens?.controlled ?? [];
  if (controlled.length > 1) throw new Error("Selecione apenas um token para executar esta macro.");
  const actor = controlled.length ? controlled[0].actor : game.user.character;
  if (!actor?.isOwner || (characterOnly && actor.type !== "personagem")) {
    throw new Error("Selecione um token que você controla ou vincule um personagem ao seu usuário.");
  }
  return actor;
}

const tools = {
  async aptidao() {
    const actor = controlledActor();
    const entries = Object.entries(SKILLS).map(([id, [label]]) => ({ id, label }));
    const data = await prompt("Rolar Aptidão", "catalog-dialog", { entries, label: "Aptidão" }, "Continuar");
    if (data) return rollTest(actor, data.entry);
  },
  async item() {
    const actor = controlledActor();
    const entries = actor.items.map(item => ({ id: item.id, label: item.name }))
      .sort((a, b) => a.label.localeCompare(b.label, "pt-BR"));
    if (!entries.length) throw new Error("Esse ator ainda não tem itens anexados.");
    const data = await prompt("Usar item da ficha", "catalog-dialog", { entries, label: "Item" }, "Usar");
    if (data) return useItem(actor.items.get(data.entry));
  },
  saude: () => changeHealth(controlledActor()),
  turno: () => clearTurn(controlledActor()),
  descansoRapido: () => rest(controlledActor(true), false),
  descansoCompleto: () => rest(controlledActor(true), true),
  lua: () => sign(controlledActor(true)),
  ciclo: async () => {
    if (!game.user.isGM) throw new Error("Apenas o mestre pode iniciar um ciclo lunar.");
    const ok = await foundry.applications.api.DialogV2.confirm({ window: { title: "Começar um novo ciclo lunar?" },
      content: "<p>Sorteia as Luas e repõe os Dados Lunares dos personagens dos jogadores.</p>",
      rejectClose: false, modal: true });
    if (ok) return newLunarCycle();
  },
  cena: () => {
    const actor = controlledActor();
    return serialize(actor, async () => {
      const changes = actor.items.filter(item => item.type === "proeza" && item.system.recarga === "cena"
        && item.system.maxUsos && item.system.usos !== item.system.maxUsos)
        .map(item => ({ _id: item.id, "system.usos": item.system.maxUsos }));
      if (changes.length) await actor.updateEmbeddedDocuments("Item", changes);
      ui.notifications.info(`Proezas por cena recuperadas: ${changes.length}.`);
    });
  }
};

export function runMacro(action) {
  return safely(() => {
    if (!Object.hasOwn(tools, action)) throw new Error("Macro de Lunatar desconhecida.");
    return tools[action]();
  });
}

export function useItemMacro(uuid) {
  return safely(async () => useItem(await foundry.utils.fromUuid(uuid)));
}

async function safely(operation) {
  try { return await operation(); }
  catch (error) {
    console.error("Lunatar |", error);
    ui.notifications.warn(error.message);
  }
}

let hotbarQueue = Promise.resolve();
export function onHotbarDrop(_bar, data, slot) {
  if (data.type !== "Item" || !/^(?:Actor\.|Scene\.).+\.Item\.[A-Za-z0-9]+$/.test(data.uuid ?? "")) return;
  hotbarQueue = hotbarQueue.then(() => safely(async () => {
    const item = await foundry.documents.Item.fromDropData(data);
    if (!item?.parent?.isOwner || item.parent.documentName !== "Actor") {
      throw new Error("Use um item anexado a um ator que você controla.");
    }
    const { Macro } = foundry.documents;
    if (!Macro.canUserCreate(game.user)) throw new Error("Seu usuário precisa de permissão para criar macros.");
    const command = `await game.lunatar.useItemMacro(${JSON.stringify(item.uuid)});`;
    const existing = game.macros.find(entry => entry.isOwner && entry.type === "script" && entry.command === command);
    const macro = existing ?? await Macro.create({ name: item.name, img: item.img, type: "script", command });
    if (macro) await game.user.assignHotbarMacro(macro, slot);
  }));
  return false;
}
