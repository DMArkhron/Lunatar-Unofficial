import { SYSTEM, PATH } from "./rules.mjs";

const { ApplicationV2, HandlebarsApplicationMixin, DialogV2 } = foundry.applications.api;
const integer = (value, fallback, min, max) => {
  const n = Number(value);
  return Number.isFinite(n) ? Math.min(max, Math.max(min, Math.trunc(n))) : fallback;
};
export function normalizeImpasse(raw = {}) {
  const track = (row = {}, label, max) => {
    const limit = integer(row.max ?? max, max, 1, 100);
    return { label: String(row.label || label).trim().slice(0, 80) || label,
      max: limit, value: integer(row.value ?? 0, 0, 0, limit) };
  };
  return { title: String(raw.title || "Novo impasse").trim().slice(0, 100) || "Novo impasse",
    progress: track(raw.progress, "Progresso", 6), failure: track(raw.failure, "Falhas", 4) };
}
export function stepImpasse(state, key, delta) {
  const next = normalizeImpasse(state);
  if (!["progress", "failure"].includes(key)) return next;
  next[key].value = integer(next[key].value + delta, 0, 0, next[key].max);
  return next;
}
const readState = () => normalizeImpasse(game.settings.get(SYSTEM, "impassePanels")[game.user.id]);
let panel;

export class ImpassePanel extends HandlebarsApplicationMixin(ApplicationV2) {
  static DEFAULT_OPTIONS = {
    id: "lunatar-impasse", classes: ["lunatar-impasse"],
    window: { title: "Painel de Impasse", icon: "fa-solid fa-bars-progress", resizable: true },
    position: { width: 620, height: "auto" },
    actions: {
      step: function(_event, button) { return this.change(button.dataset.track, Number(button.dataset.delta)); },
      configure: function() { return this.configure(); },
      reset: function() { return this.resetCounters(); }
    }
  };
  static PARTS = { body: { template: `${PATH}/templates/impasse.hbs` } };
  #queue = Promise.resolve();
  _canRender(options) { return game.user.isGM ? super._canRender(options) : false; }
  async _prepareContext(options) {
    const context = await super._prepareContext(options);
    const state = readState();
    const failed = state.failure.value === state.failure.max;
    const completed = state.progress.value === state.progress.max;
    return { ...context, title: state.title,
      status: failed && completed ? "Ambos os limites atingidos" : failed ? "Limite de falhas atingido" : completed ? "Progresso concluído" : "Em andamento",
      tone: failed ? "danger" : completed ? "success" : "neutral",
      tracks: ["progress", "failure"].map(key => ({ ...state[key], key,
        icon: key === "progress" ? "fa-flag-checkered" : "fa-triangle-exclamation",
        atMin: state[key].value === 0, atMax: state[key].value === state[key].max,
        segments: Array.from({ length: state[key].max }, (_, i) => ({ filled: i < state[key].value }))
      })) };
  }
  updateState(operation) {
    this.#queue = this.#queue.catch(() => {}).then(async () => {
      if (!game.user.isGM) return;
      const next = normalizeImpasse(operation(readState()));
      const panels = foundry.utils.deepClone(game.settings.get(SYSTEM, "impassePanels"));
      panels[game.user.id] = next;
      await game.settings.set(SYSTEM, "impassePanels", panels);
      if (this.rendered) await this.render();
      return next;
    });
    return this.#queue.catch(error => { console.error("Lunatar | Impasse", error); ui.notifications.error("Não foi possível salvar o painel de Impasse."); });
  }
  change(key, delta) {
    if (!["progress", "failure"].includes(key) || ![-1, 1].includes(delta)) return;
    return this.updateState(state => stepImpasse(state, key, delta));
  }
  async configure() {
    if (!game.user.isGM) return;
    const state = readState();
    const content = await foundry.applications.handlebars.renderTemplate(`${PATH}/templates/impasse-config.hbs`, state);
    const data = await DialogV2.prompt({ window: { title: "Configurar Impasse" },
      content, modal: true, rejectClose: false, classes: ["lunatar-impasse"],
      ok: { label: "Salvar painel", callback: (_event, button) => Object.fromEntries(new FormData(button.form)) } });
    if (!data) return;
    if (![data.progressMax, data.failureMax].every(value => Number.isInteger(Number(value)) && Number(value) >= 1 && Number(value) <= 100)) {
      ui.notifications.warn("Defina limites inteiros entre 1 e 100 etapas."); return;
    }
    return this.updateState(current => ({ title: data.title,
      progress: { ...current.progress, label: data.progressLabel, max: Number(data.progressMax) },
      failure: { ...current.failure, label: data.failureLabel, max: Number(data.failureMax) } }));
  }
  async resetCounters() {
    if (!game.user.isGM) return;
    const ok = await DialogV2.confirm({ window: { title: "Reiniciar marcadores?" }, modal: true, rejectClose: false,
      content: "<p>Zerar o progresso e as falhas? O nome e os limites serão mantidos.</p>" });
    if (ok) return this.updateState(state => ({ ...state, progress: { ...state.progress, value: 0 }, failure: { ...state.failure, value: 0 } }));
  }
}
export function openImpasse() {
  if (!game.user.isGM) return;
  panel ??= new ImpassePanel();
  return panel.render({ force: true });
}
export function addImpasseButton(_app, element) {
  if (!game.user.isGM) return;
  const root = element?.querySelector ? element : element?.[0];
  if (!root || root.querySelector(".ln-open-impasse")) return;
  const header = root.querySelector(".directory-header");
  if (!header) return;
  const button = document.createElement("button");
  button.type = "button"; button.className = "ln-open-impasse";
  button.innerHTML = '<i class="fa-solid fa-bars-progress" aria-hidden="true"></i> Painel de Impasse';
  button.addEventListener("click", () => openImpasse());
  header.append(button);
}
Hooks.once("init", () => {
  game.settings.register(SYSTEM, "impassePanels", { scope: "client", config: false, type: Object, default: {} });
  game.settings.registerMenu(SYSTEM, "impassePanel", { name: "Painel de Impasse", label: "Abrir painel",
    hint: "Marcadores de progresso e falhas para o mestre.", icon: "fa-solid fa-bars-progress", type: ImpassePanel, restricted: true });
});
Hooks.once("ready", () => { game.lunatar.openImpasse = openImpasse; });
Hooks.on("renderActorDirectory", addImpasseButton);
Hooks.on("renderCombatTracker", addImpasseButton);
