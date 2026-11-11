import { PATH, SYSTEM } from "./rules.mjs";

export const LOGO = `${PATH}/assets/logo.png`;

export function brandPause(app, element) {
  const root = (element?.querySelector ? element : element?.[0]) ?? app?.element;
  const image = root?.querySelector("img");
  if (!image) return;
  root.classList.add("lunatar-pause");
  image.src = `${PATH}/assets/logo-transparent.png`;
  image.alt = "Lunatar RPG";
}

export async function applyWorldCover() {
  if (!game.user.isGM || game.settings.get(SYSTEM, "logoCoverApplied")) return;
  if (game.users.activeGM?.id && game.users.activeGM.id !== game.user.id) return;
  if (game.world.background === LOGO) {
    await game.settings.set(SYSTEM, "logoCoverApplied", true);
    return;
  }
  const config = new foundry.applications.sidebar.apps.WorldConfig({ world: game.world });
  try {
    await config.render({ force: true });
    const field = config.element?.querySelector('[name="background"]');
    if (!field) throw new Error("Campo de imagem de fundo não encontrado.");
    await game.settings.set(SYSTEM, "previousWorldCover", game.world.background || "");
    field.value = LOGO;
    field.dispatchEvent(new Event("change", { bubbles: true }));
    await config.submit();
    await game.settings.set(SYSTEM, "logoCoverApplied", true);
  } catch (error) {
    console.error("Lunatar | Capa do mundo", error);
    ui.notifications.warn(`Não foi possível aplicar a capa automaticamente. Em Editar Mundo, use: ${LOGO}`);
  } finally {
    if (config.rendered) await config.close();
  }
}

Hooks.once("init", () => {
  game.settings.register(SYSTEM, "logoCoverApplied", {
    scope: "world", config: false, type: Boolean, default: false
  });
  game.settings.register(SYSTEM, "previousWorldCover", {
    scope: "world", config: false, type: String, default: ""
  });
});
Hooks.on("renderGamePause", brandPause);
Hooks.on("renderPause", brandPause);
Hooks.once("ready", () => {
  brandPause(ui.pause, ui.pause?.element);
  applyWorldCover().catch(error => console.error("Lunatar | Capa", error));
});
