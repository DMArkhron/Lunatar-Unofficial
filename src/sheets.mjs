import { SLOT_LABELS, equipmentSlots, equippedAt } from "./equipment.mjs";
import { PATH, SYSTEM, SCALE, ATTRIBUTES, CONCRETE, SKILLS, CLASSES, ORIGINS, MOONS,
  ITEM_LABELS, rankLimit } from "./rules.mjs";
import { NATURE_TRAITS } from "./features.mjs";
import { ARMOR, WEAPONS, MAGIC, itemIcon, aptitudeIcon } from "./catalog.mjs";
import { compose } from "./formulation.mjs";
import { chooseClass, equipItem, useItem } from "./item-actions.mjs";
import { attributeFor, prompt, rollTest, clearTurn, changeHealth, rest, serialize, sign, newLunarCycle } from "./actions.mjs";

const { api, sheets } = foundry.applications;
const options = (source, current = "") => Object.entries(source).map(([id, label]) => ({
  id, label, selected: String(id) === String(current)
}));
const selected = (rows, current) => rows.map(([id, label]) => ({ id, label, selected: id === current }));
const dice = (limit, current) => selected(SCALE.slice(0, limit + 1).map((die, i) => [i, `d${die}`]), current);
const pathDescriptions = {
  cruzado: "Defesa dos aliados e combate sagrado.",
  sacerdote: "Cura, bênçãos e proteção sobrenatural.",
  shura: "Combate desarmado e domínio dos Chakras.",
  barbaro: "Fúria, força e resistência sob pressão.",
  cavaleiro: "Combate montado e Código de Honra.",
  lamina: "Técnicas de arma ligadas aos Signos Lunares.",
  feiticeiro: "Poder inato e intensificação da magia.",
  mago: "Estudo de fórmulas, sigilos e conservação de recursos.",
  pactuado: "Poder de um pacto e combate ao lado de uma Abominação.",
  cacador: "Rastreamento, Instinto Selvagem e Vínculo Animal.",
  druida: "Transformação e uso de Formas Selvagens.",
  xama: "Invocações e comunicação com espíritos do Eco.",
  executor: "Furtividade e eliminação de alvos marcados.",
  trapaceiro: "Ilusões, duplicatas e manipulação mental.",
  gatuno: "Arsenal de Engenhocas e dispositivos em combate."
};
const tabIcons = {
  base: "fa-address-card", inventory: "fa-suitcase", magic: "fa-wand-magic-sparkles",
  features: "fa-book-open", notes: "fa-feather"
};
const baseClasses = Object.fromEntries(Object.entries(CLASSES).map(([id, c]) => [id, c.label]));
const origins = Object.fromEntries(Object.entries(ORIGINS).map(([id, [label]]) => [id, label]));
const abilities = Object.fromEntries(Object.entries(SKILLS).map(([id, [label]]) => [id, label]));
const tpl = name => `${PATH}/templates/${name}.hbs`;
const updatePortrait = sheet => new foundry.applications.apps.FilePicker.implementation({
  type: "image", current: sheet.document.img,
  callback: img => sheet.document.update({ img })
}).render({ force: true });

async function openPortrait(sheet) {
  const content = await foundry.applications.handlebars.renderTemplate(tpl("portrait-dialog"), {
    src: sheet.document.img, name: sheet.document.name
  });
  const buttons = [{ action: "close", label: "Fechar", default: true }];
  if (sheet.isEditable) buttons.push({ action: "replace", label: "Trocar imagem", icon: "fa-solid fa-image" });
  const action = await api.DialogV2.wait({
    classes: ["lunatar", "lunatar-portrait-dialog"], position: { width: 540 },
    window: { title: "Retrato" }, content, buttons, rejectClose: false
  });
  if (action === "replace" && sheet.isEditable) return updatePortrait(sheet);
}

const manualStats = [
  ["saude", "Saúde máxima", 1], ["magia", "Magia máxima", 0], ["defesa", "Defesa", 0],
  ["defesaMagica", "Defesa Mágica", 0], ["protecao", "Proteção", 0]
];

async function editStats(actor) {
  if (actor.type !== "personagem" || !actor.isOwner) return;
  const data = await prompt("Editar valores da ficha", "manual-stats", {
    fields: manualStats.map(([key, label, min]) => ({
      key, label, min, value: actor.system.manual[key], automatic: actor.system.automaticStats[key]
    }))
  }, "Aplicar valores", { classes: ["lunatar", "lunatar-roll-dialog"], position: { width: 475 } });
  if (!data) return;
  await serialize(actor, () => {
    const updates = {};
    for (const [key, label, min] of manualStats) {
      if (typeof data[key] !== "string") continue;
      const raw = data[key].trim();
      const value = raw === "" ? null : Number(raw);
      if (value !== null && (!Number.isSafeInteger(value) || value < min)) {
        throw new Error(`${label} precisa ser um número inteiro de pelo menos ${min}.`);
      }
      if (value === actor.system.manual[key]) continue;
      updates[`system.manual.${key}`] = value;
      if (key === "saude" || key === "magia") {
        const max = value ?? actor.system.automaticStats[key];
        if (actor.system[key].value > max) updates[`system.${key}.value`] = max;
      }
    }
    if (Object.keys(updates).length) return actor.update(updates);
  });
}

async function createFromCatalog(actor, kind) {
  const catalog = kind === "arma" ? WEAPONS : ARMOR;
  const data = await prompt("Catálogo de equipamento", "catalog-dialog", {
    entries: catalog.map((item, i) => ({ id: i, label: item.name }))
  }, "Adicionar");
  if (data && catalog[data.entry]) await actor.createEmbeddedDocuments("Item", [catalog[data.entry]]);
}

async function editAptitude(actor, key) {
  if (!Object.hasOwn(SKILLS, key)) return;
  const pc = actor.type === "personagem";
  const limit = pc ? rankLimit(actor.system.nivel) : SCALE.length - 1;
  const storedRank = actor.system.aptidoes[key];
  const data = await prompt(`Editar Aptidão · ${SKILLS[key][0]}`, "aptitude-dialog", {
    attribute: ATTRIBUTES[attributeFor(actor, key)], pc,
    mastery: actor.system.maestrias?.[key], cap: SCALE[limit],
    overCap: storedRank > limit, recordedDie: SCALE[storedRank],
    ranks: SCALE.map((die, rank) => ({ die, icon: die === 16 ? `${PATH}/assets/d16.svg` : `icons/dice/d${die}black.svg`, rank, selected: rank === storedRank, locked: rank > limit }))
  }, "Salvar Aptidão", { classes: ["lunatar", "lunatar-roll-dialog"], position: { width: 460 } });
  if (!data) return;
  const changes = {};
  if (data.rank !== undefined) {
    const rank = Number(data.rank);
    const currentLimit = pc ? rankLimit(actor.system.nivel) : SCALE.length - 1;
    if (!Number.isInteger(rank) || rank < 0 || rank > currentLimit) {
      throw new Error(`A graduação deve respeitar o limite d${SCALE[currentLimit]}.`);
    }
    changes[`system.aptidoes.${key}`] = rank;
  }
  if (pc && typeof data.mastery === "string") changes[`system.maestrias.${key}`] = data.mastery.trim();
  if (Object.keys(changes).length) return actor.update(changes);
}

const normalizedSearch = value => value.normalize("NFD").replace(/\p{Diacritic}/gu, "").toLocaleLowerCase("pt-BR");

const actorActions = {
  portrait: sheet => openPortrait(sheet),
  test: (sheet, button) => rollTest(sheet.actor, button.dataset.skill),
  editAptitude: (sheet, button) => editAptitude(sheet.actor, button.dataset.skill),
  editStats: sheet => editStats(sheet.actor),
  choosePath: (sheet, button) => chooseClass(sheet.actor, {
    classe: button.dataset.classe, trilha: button.dataset.path
  }),
  clearPath: (sheet, button) => chooseClass(sheet.actor, { classe: button.dataset.classe, clear: true }),
  sign: sheet => sign(sheet.actor),
  cycle: async () => {
    const ok = await api.DialogV2.confirm({ window: { title: "Começar um novo ciclo lunar?" },
      content: "<p>Sorteia as Luas e repõe os Dados Lunares dos personagens dos jogadores.</p>",
      rejectClose: false, modal: true });
    if (ok) return newLunarCycle();
  },
  health: sheet => changeHealth(sheet.actor),
  reset: sheet => clearTurn(sheet.actor),
  rest: (sheet, button) => rest(sheet.actor, button.dataset.kind === "complete"),
  compose: sheet => compose(sheet.actor),
  catalog: (sheet, button) => createFromCatalog(sheet.actor, button.dataset.kind),
  add: async (sheet, button) => {
    const type = button.dataset.kind;
    const [item] = await sheet.actor.createEmbeddedDocuments("Item", [{ type, name: `Novo · ${ITEM_LABELS[type]}` }]);
    return item.sheet.render({ force: true });
  },
  edit: (sheet, button) => sheet.actor.items.get(button.dataset.id)?.sheet.render({ force: true }),
  use: (sheet, button) => useItem(sheet.actor.items.get(button.dataset.id)),
  equip: (sheet, button) => equipItem(sheet.actor.items.get(button.dataset.id)),
  remove: async (sheet, button) => {
    const item = sheet.actor.items.get(button.dataset.id);
    if (!item) return;
    const ok = await api.DialogV2.confirm({ window: { title: "Remover item da ficha?" },
      content: "<p>O registro será excluído deste ator.</p>", rejectClose: false, modal: true });
    if (ok) return item.delete();
  }
};

const wrapped = handlers => Object.fromEntries(Object.entries(handlers).map(([key, run]) => [
  key, async function (_event, button) {
    if (!this.isEditable && !["edit", "portrait"].includes(key)) return;
    try { await run(this, button); }
    catch (error) { console.error("Lunatar |", error); ui.notifications.warn(error.message); }
  }
]));

export class LunatarActorSheet extends api.HandlebarsApplicationMixin(sheets.ActorSheetV2) {
  #aptitudeFilters = { query: "", attribute: "", trained: false };
  #inventoryFilters = { query: "", equipped: false };
  #inventoryCollapsed = new Set();

  static DEFAULT_OPTIONS = {
    classes: ["lunatar", "lunatar-actor"], tag: "form",
    form: { submitOnChange: true, closeOnSubmit: false },
    position: { width: 890, height: 825 }, window: { resizable: true },
    actions: {
      ...wrapped(actorActions),
      selectTab(_event, button) {
        const tab = button.dataset.tab;
        if (!this.constructor.TABS.sheet.tabs.some(entry => entry.id === tab)) return;
        this.tabGroups.sheet = tab;
        for (const element of this.element.querySelectorAll('[data-group="sheet"][data-tab]')) {
          const active = element.dataset.tab === tab;
          element.classList.toggle("active", active);
          if (element.matches("button")) element.setAttribute("aria-pressed", String(active));
        }
      }
    }
  };
  static PARTS = { sheet: { template: tpl("actor"), scrollable: [""] } };
  static TABS = { sheet: { initial: "base", tabs: [
    { id: "base", label: "Ficha" }, { id: "inventory", label: "Equipamentos" },
    { id: "magic", label: "Formulações" }, { id: "features", label: "Classe, Proezas e Traços" },
    { id: "notes", label: "Anotações" }
  ] } };

  async _prepareContext(optionsForRender) {
    const context = await super._prepareContext(optionsForRender);
    const actor = this.actor;
    const system = actor.system;
    const pc = actor.type === "personagem";
    const klass = CLASSES[system.classe];
    const paths = klass?.paths ?? {};
    const unlocked = system.nivel >= 5;
    const superior = Object.hasOwn(paths, system.trilha) ? paths[system.trilha] : null;
    const cap = pc ? rankLimit(system.nivel) : 6;
    const abilities = Object.entries(SKILLS).map(([key, [label]]) => {
      const attribute = attributeFor(actor, key);
      const recordedRank = system.aptidoes[key];
      const rank = Math.min(recordedRank, cap);
      return {
        key, label, img: aptitudeIcon(key), attribute, attr: ATTRIBUTES[attribute], concrete: CONCRETE.includes(attribute),
        mastery: system.maestrias?.[key], rank, die: SCALE[rank],
        dieIcon: SCALE[rank] === 16 ? `${PATH}/assets/d16.svg` : `icons/dice/d${SCALE[rank]}black.svg`,
        recordedDie: SCALE[recordedRank],
        trained: rank > 0, overCap: recordedRank > cap,
        steps: SCALE.map((die, index) => ({ die, filled: index <= rank, locked: index > cap }))
      };
    });
    const worn = equipmentSlots(actor);
    const groups = Object.fromEntries(Object.entries(ITEM_LABELS).map(([type, label]) => [type, {
      type, label, isWeapon: type === "arma", canCreate: type !== "classe", catalog: ["arma", "armadura"].includes(type),
      items: actor.items.filter(item => item.type === type).sort((a, b) => a.sort - b.sort).map(item => ({
        id: item.id, name: item.name, img: itemIcon(item), system: item.system,
        wornAt: SLOT_LABELS[equippedAt(worn, item.id)], hands: item.system.duasMaos || (worn.esquerda === item.id && worn.direita === item.id) ? "Duas Mãos" : "Uma Mão",
        action: ({ arma: "Atacar", armadura: "Equipar",
          equipamento: "Mostrar", proeza: "Usar", traco: "Mostrar", classe: "Aplicar", formulacao: "Conjurar" })[type],
        armor: type === "armadura", weapon: type === "arma", gear: type === "equipamento",
        spell: type === "formulacao", feat: type === "proeza", classRecord: type === "classe",
        classActive: type === "classe" && item.system.classe === system.classe
          && (!item.system.trilha || (unlocked && item.system.trilha === system.trilha)),
        classUnavailable: type === "classe" && Boolean(item.system.trilha) && (!unlocked || item.system.classe !== system.classe),
        cost: type === "formulacao" ? item.system.custoForma + item.system.custoPalavra + item.system.custoExtra : 0
      }))
    }]));
    const attrs = Object.entries(ATTRIBUTES).map(([id, label]) => ({
      id, label, icon: `${PATH}/assets/icons/atributo-${id}.svg`, value: system.caracteristicas?.[id]
    }));
    const moon = game.settings.get(SYSTEM, "luas");
    return { ...context, actor, system, pc, editable: this.isEditable, isGM: game.user.isGM, abilities, groups,
      inventory: [groups.arma, groups.armadura, groups.equipamento],
      loadout: Object.entries(worn).map(([slot, id]) => {
        const item = actor.items.find(entry => entry.id === id);
        return { label: SLOT_LABELS[slot], id, name: item?.name, img: item && itemIcon(item) };
      }),
      cap: SCALE[cap], attributeFilters: options(ATTRIBUTES), half: Math.floor(system.saude.max / 2),
      halfActive: system.saude.value <= Math.floor(system.saude.max / 2), collapsed: system.saude.value === 0,
      concrete: attrs.slice(0, CONCRETE.length), abstract: attrs.slice(CONCRETE.length),
      attributeOptions: options(ATTRIBUTES, system.formulacaoAtributo),
      classes: options(baseClasses, system.classe), origins: options(origins, system.origem),
      progression: {
        base: klass?.label, baseId: system.classe, superior: superior?.[0], unlocked,
        paths: Object.entries(paths).map(([id, [label]]) => {
          const attached = groups.classe.items.find(item => item.system.classe === system.classe && item.system.trilha === id);
          const current = id === system.trilha;
          return { id, label, description: pathDescriptions[id], current, active: current && unlocked,
            img: attached?.img ?? itemIcon({ name: label, type: "classe" }), attached: attached?.id };
        })
      },
      moons: MOONS.map((label, index) => ({ id: index + 1, label, selected: index + 1 === system.lua })),
      sky: moon.map(index => MOONS[index - 1]).join(", "), moonActive: moon.includes(system.lua),
      ward: klass?.ward.length === 3 ? options({ instinto: "Instinto", personalidade: "Personalidade" }, system.wardAtributo) : null,
      def: klass?.def.length === 3 ? options({ corpo: "Corpo", agilidade: "Agilidade" }, system.defAtributo) : null,
      canCompose: Boolean(MAGIC[system.classe]), status: [...actor.statuses].map(id => CONFIG.statusEffects.find(e => e.id === id)?.name ?? id),
      tabs: Object.fromEntries(Object.entries(this._prepareTabs("sheet"))
        .map(([id, tab]) => [id, { ...tab, icon: tabIcons[id] }])),
      nature: system.classe === "naturalista" ? options(Object.fromEntries(
        Object.entries(NATURE_TRAITS).map(([key, [name]]) => [key, name])), system.trilhaNatureza) : null
    };
  }

  _onRender(context, options) {
    super._onRender(context, options);
    const portrait = this.element.querySelector('[data-action="portrait"]');
    if (portrait) portrait.disabled = false;
    this.#bindInventory();
    const section = this.element.querySelector("[data-lunatar-aptitudes]");
    if (!section) return;
    const toolbar = section.querySelector("[data-aptitude-filters]");
    const search = toolbar.querySelector("[data-aptitude-query]");
    const attribute = toolbar.querySelector("[data-aptitude-attribute]");
    const trained = toolbar.querySelector("[data-aptitude-trained]");
    const clear = toolbar.querySelector("[data-aptitude-clear]");
    const cards = [...section.querySelectorAll("[data-aptitude-card]")];
    const empty = section.querySelector("[data-aptitude-empty]");
    const count = section.querySelector("[data-aptitude-count]");
    const index = cards.map(card => ({ card, text: normalizedSearch(card.dataset.search) }));

    for (const field of [search, attribute, trained, clear]) field.disabled = false;
    search.value = this.#aptitudeFilters.query;
    attribute.value = this.#aptitudeFilters.attribute;
    trained.checked = this.#aptitudeFilters.trained;

    const applyFilters = () => {
      this.#aptitudeFilters = { query: search.value, attribute: attribute.value, trained: trained.checked };
      const words = normalizedSearch(search.value).trim().split(/\s+/).filter(Boolean);
      let visible = 0;
      for (const { card, text } of index) {
        const matches = (!attribute.value || card.dataset.attribute === attribute.value)
          && (!trained.checked || card.dataset.trained === "true")
          && words.every(word => text.includes(word));
        card.hidden = !matches;
        if (matches) visible++;
      }
      count.textContent = `${visible} de ${cards.length} aptidões`;
      empty.hidden = visible > 0;
    };

    search.oninput = applyFilters;
    toolbar.onchange = event => { event.stopPropagation(); applyFilters(); };
    search.onkeydown = event => { if (event.key === "Enter") event.preventDefault(); };
    clear.onclick = () => {
      search.value = "";
      attribute.value = "";
      trained.checked = false;
      applyFilters();
      search.focus();
    };
    applyFilters();
  }

  #bindInventory() {
    const inventory = this.element.querySelector("[data-lunatar-inventory]");
    if (!inventory) return;
    const filters = inventory.querySelector("[data-inventory-filters]");
    const search = filters.querySelector("[data-inventory-query]");
    const equipped = filters.querySelector("[data-inventory-equipped]");
    const count = inventory.querySelector("[data-inventory-count]");
    const groups = [...inventory.querySelectorAll("[data-inventory-group]")].map(group => ({
      group,
      empty: group.querySelector("[data-inventory-empty]"),
      rows: [...group.querySelectorAll("[data-item-id]")].map(row => ({
        row, text: normalizedSearch(row.dataset.search)
      }))
    }));
    for (const { group } of groups) {
      const toggle = group.querySelector("[data-inventory-toggle]");
      const type = [...group.classList].find(name => name.startsWith("ln-inventory-") && name !== "ln-inventory-group");
      const collapsed = this.#inventoryCollapsed.has(type);
      group.classList.toggle("ln-collapsed", collapsed);
      toggle.setAttribute("aria-expanded", String(!collapsed));
      toggle.onclick = () => {
        const next = group.classList.toggle("ln-collapsed");
        if (next) this.#inventoryCollapsed.add(type);
        else this.#inventoryCollapsed.delete(type);
        toggle.setAttribute("aria-expanded", String(!next));
      };
    }
    search.disabled = equipped.disabled = false;
    search.value = this.#inventoryFilters.query;
    equipped.checked = this.#inventoryFilters.equipped;
    const refresh = () => {
      this.#inventoryFilters = { query: search.value, equipped: equipped.checked };
      const terms = normalizedSearch(search.value).trim().split(/\s+/).filter(Boolean);
      let visible = 0;
      for (const { rows, empty } of groups) {
        let groupCount = 0;
        for (const { row, text } of rows) {
          row.hidden = (equipped.checked && row.dataset.equipped !== "true")
            || !terms.every(term => text.includes(term));
          if (!row.hidden) groupCount++;
        }
        empty.hidden = groupCount > 0;
        visible += groupCount;
      }
      count.textContent = `${visible} de ${groups.reduce((sum, group) => sum + group.rows.length, 0)} itens`;
    };
    search.oninput = refresh;
    search.onkeydown = event => { if (event.key === "Enter") event.preventDefault(); };
    filters.onchange = event => { event.stopPropagation(); refresh(); };
    refresh();
  }

  async _onDropItem(event, item) {
    if (!item.pack?.startsWith(`${SYSTEM}.`)) return super._onDropItem(event, item);
    if (!this.isEditable || !this.actor.isOwner) return;
    const source = item.toObject();
    delete source._id;
    source.folder = null;
    source._stats ??= {};
    source._stats.compendiumSource = item.uuid;
    const [created] = await this.actor.createEmbeddedDocuments("Item", [source]);
    if (created) ui.notifications.info(`${created.name} foi anexado à ficha.`);
    return created;
  }

  _processFormData(event, form, formData) {
    const data = super._processFormData(event, form, formData);
    if (data.system?.classe !== undefined && data.system.classe !== this.actor.system.classe) {
      data.system.trilha = "";
      data.system.trilhaNatureza = "";
    }
    return data;
  }
}

export class LunatarItemSheet extends api.HandlebarsApplicationMixin(sheets.ItemSheetV2) {
  static DEFAULT_OPTIONS = {
    classes: ["lunatar", "lunatar-item"], tag: "form",
    form: { submitOnChange: true, closeOnSubmit: false },
    position: { width: 560, height: 650 }, window: { resizable: true },
    actions: wrapped({
      use: sheet => useItem(sheet.document),
      equip: sheet => equipItem(sheet.document),
      itemIcon: sheet => updatePortrait(sheet),
      spellStep(sheet, button) {
        const input = button.closest(".ln-spell-step").querySelector("input");
        const before = input.value;
        if (button.dataset.step === "1") input.stepUp();
        else input.stepDown();
        if (input.value !== before) input.dispatchEvent(new Event("change", { bubbles: true }));
      }
    })
  };
  static PARTS = { sheet: { template: tpl("item"), scrollable: [""] } };

  _onRender(context, options) {
    super._onRender(context, options);
    const editor = this.element.querySelector("[data-spell-editor]");
    if (!editor || !this.isEditable) return;
    const fields = [...editor.querySelectorAll("[data-pm-part]")];
    const reflex = editor.querySelector('[name="system.reflexo"]');
    const actions = editor.querySelector('[name="system.custoAcao"]');
    const refresh = () => {
      const amount = input => Math.max(0, input.valueAsNumber || 0);
      editor.querySelector("[data-spell-pm]").textContent = fields.reduce((sum, input) => sum + amount(input), 0);
      editor.querySelector("[data-spell-reflex]").textContent = amount(reflex) ? `${amount(reflex)}d4` : "0";
      editor.querySelector("[data-spell-actions]").textContent = amount(actions);
      for (const stepper of editor.querySelectorAll(".ln-spell-step")) {
        const input = stepper.querySelector("input");
        const value = amount(input);
        stepper.querySelector('[data-step="-1"]').disabled = value <= Number(input.min);
        stepper.querySelector('[data-step="1"]').disabled = input.max !== "" && value >= Number(input.max);
      }
    };
    editor.addEventListener("input", refresh);
    editor.addEventListener("change", refresh);
    refresh();
  }

  async _prepareContext(optionsForRender) {
    const context = await super._prepareContext(optionsForRender);
    const item = this.document;
    const s = item.system;
    const spellNumbers = item.type === "formulacao" ? [
      ["custoForma", "PM da Forma", true], ["custoPalavra", "PM da Palavra", true],
      ["custoExtra", "PM extras", true], ["reflexo", "Reflexo"], ["custoAcao", "Ações"], ["trunfos", "Trunfos", false, 2]
    ].map(([key, name, pm, max]) => ({ key, name, pm, max, value: s[key] })) : [];
    return { ...context, item, img: itemIcon(item), s, spellNumbers, canUse: this.isEditable && item.parent?.documentName === "Actor",
      classLabel: CLASSES[s.classe]?.label, editable: this.isEditable, label: ITEM_LABELS[item.type],
      flags: { [item.type]: true }, skillOptions: options(abilities, s.aptidao),
      attributeOptions: options(ATTRIBUTES, s.atributoDano),
      actionTypes: options({ "Ação": "Ação", "Reação": "Reação", "Livre": "Livre", "Passiva": "Passiva",
        "Ação ou Reação": "Ação ou Reação", "Ação e Reação": "Ação e Reação" }, s.tipoAcao),
      sceneRecharge: s.recarga === "cena",
      cost: item.type === "formulacao" ? s.custoForma + s.custoPalavra + s.custoExtra : 0 };
  }
}
