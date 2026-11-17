import { SYSTEM } from "./rules.mjs";

export function installFilePickerMemory(Picker, settings = game.settings) {
  const original = Picker.prototype.browse;
  const opened = new WeakSet();
  let last = settings.get(SYSTEM, "lastFilePickerLocation");
  Picker.prototype.browse = async function(target, options = {}) {
    const first = !opened.has(this);
    opened.add(this);
    const previousSource = this.activeSource;
    const restore = first && settings.get(SYSTEM, "rememberFilePickerFolder")
      && last && typeof last.target === "string" && this.sources[last.source];
    if (restore) {
      this.activeSource = last.source;
      if (last.bucket) this.sources[last.source].bucket = last.bucket;
      target = last.target;
      options = { ...options, ...(last.bucket ? { bucket: last.bucket } : {}) };
    }
    let result;
    try {
      result = await original.call(this, target, options);
    } catch (error) {
      if (!restore) throw error;
      this.activeSource = previousSource;
      result = await original.call(this);
    }
    if (settings.get(SYSTEM, "rememberFilePickerFolder") && typeof this.target === "string") {
      last = { source: this.activeSource, target: this.target,
        bucket: this.source?.bucket ?? "" };
      // Update memory immediately; storage failures must never block the picker.
      Promise.resolve(settings.set(SYSTEM, "lastFilePickerLocation", last))
        .catch(error => console.warn("Lunatar | Pasta do seletor", error));
    }
    return result;
  };
}

Hooks.once("init", () => {
  game.settings.register(SYSTEM, "rememberFilePickerFolder", {
    name: "Lembrar a última pasta de imagens",
    hint: "Abre o seletor na última pasta e aba utilizadas, inclusive para retratos, tokens e handouts.",
    scope: "client", config: true, type: Boolean, default: true
  });
  game.settings.register(SYSTEM, "lastFilePickerLocation", {
    scope: "client", config: false, type: Object, default: {}
  });
});

Hooks.once("ready", () => {
  installFilePickerMemory(foundry.applications.apps.FilePicker.implementation);
});
