export const SLOT_LABELS = { esquerda: "Mão Esquerda", direita: "Mão Direita", corpo: "Corpo", ambas: "Duas Mãos" };

export function equipmentOptions(item) {
  if (item.type === "arma") {
    if (item.system.duasMaos) return ["ambas"];
    return item.system.versatil ? ["esquerda", "direita", "ambas"] : ["esquerda", "direita"];
  }
  if (item.type === "armadura") return item.system.escudo ? ["esquerda", "direita"] : ["corpo"];
  return item.type === "equipamento" ? ["esquerda", "direita", "corpo"] : [];
}

export function equipmentSlots(actor) {
  const items = actor.items;
  const saved = actor.system?.equipagem;
  if (!saved?.configurada) {
    const armor = items.filter(item => item.type === "armadura" && item.system.equipado);
    const best = (shield, stat) => armor.filter(item => item.system.escudo === shield)
      .sort((a, b) => b.system[stat] - a.system[stat])[0]?.id ?? "";
    return { esquerda: best(true, "defesa"), direita: "", corpo: best(false, "protecao") };
  }
  const getItem = id => id && items.find(item => item.id === id);
  const slots = { esquerda: "", direita: "", corpo: "" };
  for (const slot of Object.keys(slots)) {
    const item = getItem(saved[slot]);
    if (!item) continue;
    const options = equipmentOptions(item);
    const both = slot !== "corpo" && saved.esquerda === saved.direita;
    if ((both && options.includes("ambas")) || options.includes(slot)) slots[slot] = item.id;
  }
  if (slots.esquerda && slots.esquerda === slots.direita && !equipmentOptions(getItem(slots.direita)).includes("ambas")) {
    slots.esquerda = "";
  }
  return slots;
}

export function equippedAt(slots, id) {
  if (!id) return "";
  if (slots.esquerda === id && slots.direita === id) return "ambas";
  return Object.keys(slots).find(slot => slots[slot] === id) ?? "";
}

export function assignEquipment(slots, item, position) {
  if (position && !equipmentOptions(item).includes(position)) throw new Error("Este item não pode ocupar esse espaço.");
  const updated = { ...slots };
  const targets = position === "ambas" ? ["esquerda", "direita"] : position ? [position] : [];
  const displaced = new Set([item.id, ...targets.map(slot => slots[slot]).filter(Boolean)]);
  for (const slot of Object.keys(updated)) if (displaced.has(updated[slot])) updated[slot] = "";
  for (const slot of targets) updated[slot] = item.id;
  return updated;
}
