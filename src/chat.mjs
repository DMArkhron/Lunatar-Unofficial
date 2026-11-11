import { PATH, SYSTEM } from "./rules.mjs";

const { ChatMessage } = foundry.documents;
const labels = {
  skill: "Teste de Aptidão", attack: "Ataque", spell: "Formulação", damage: "Dano",
  reflex: "Reflexo", lunar: "Signo Lunar", feat: "Proeza", trait: "Traço", gear: "Equipamento"
};
const escape = value => String(value ?? "").replace(/[&<>"']/g, character =>
  ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[character]);

const hasMessageModes = () => Boolean(CONFIG.ChatMessage?.modes);
export const defaultChatMode = () => game.settings.get("core", hasMessageModes() ? "messageMode" : "rollMode");
export const publicChatMode = () => hasMessageModes() ? "public" : "publicroll";

export function chatModeOptions() {
  const selected = defaultChatMode();
  const modes = hasMessageModes() ? CONFIG.ChatMessage.modes : CONFIG.Dice.rollModes;
  return Object.entries(modes).map(([id, definition]) => ({
    id, label: game.i18n.localize(definition.label ?? definition), selected: id === selected
  }));
}

function cardMarkup(card) {
  const kind = Object.hasOwn(labels, card.kind) ? card.kind : "skill";
  const tone = card.success === true ? "success" : card.success === false ? "failure" : "neutral";
  const metrics = Array.isArray(card.metrics) && card.metrics.length ? `<dl class="ln-chat-metrics">
    ${card.metrics.map(({ label, value }) => `<div><dt>${escape(label)}</dt><dd>${escape(value)}</dd></div>`).join("")}
  </dl>` : "";
  const outcome = card.status ? `<span class="ln-chat-status ln-chat-${tone}">${escape(card.status)}</span>` : "";
  return `<article class="lunatar-chat ln-chat-${kind}">
    <header class="ln-chat-heading">
      <img src="${PATH}/assets/moon.svg" alt="">
      <div><small>${labels[kind]}</small><strong>${escape(card.title)}</strong></div>
    </header>
    <div class="ln-chat-body">
      ${outcome}
      ${card.subtitle ? `<p class="ln-chat-subtitle">${escape(card.subtitle)}</p>` : ""}
      ${metrics}
      ${card.detail ? `<p class="ln-chat-detail">${escape(card.detail)}</p>` : ""}
    </div>
  </article>`;
}

export function postRoll(actor, roll, card, mode = defaultChatMode()) {
  return postRollBundle(actor, [{ roll, label: "Teste" }], card, mode);
}

export async function postRollBundle(actor, entries, card, mode = defaultChatMode()) {
  const visibility = hasMessageModes() ? { messageMode: mode } : { rollMode: mode };
  const [first] = entries;
  const data = await first.roll.toMessage({
    speaker: ChatMessage.getSpeaker({ actor }),
    flags: { [SYSTEM]: { rollCard: { ...card, rollLabels: entries.map(entry => entry.label) } } }
  }, { ...visibility, create: false });
  data.rolls = entries.map(({ roll }) => roll.toJSON());
  return ChatMessage.create(data);
}

export function postCard(actor, card, mode = defaultChatMode()) {
  const message = { speaker: ChatMessage.getSpeaker({ actor }), content: cardMarkup(card) };
  if (hasMessageModes()) ChatMessage.applyMode(message, mode);
  else ChatMessage.applyRollMode(message, mode);
  return ChatMessage.create(message);
}

export function renderRollCard(message, html) {
  if (!message.isContentVisible) return;
  const card = message.getFlag(SYSTEM, "rollCard");
  if (!card) return;
  const content = html.querySelector(".message-content");
  if (!content || content.querySelector(".lunatar-chat")) return;
  const rolls = [...content.querySelectorAll(".dice-roll")];
  content.insertAdjacentHTML("afterbegin", cardMarkup(card));
  const body = content.querySelector(".ln-chat-body");
  for (const [index, roll] of rolls.entries()) {
    const label = document.createElement("h4");
    label.className = "ln-chat-roll-label";
    label.textContent = card.rollLabels?.[index] ?? "Rolagem";
    body.append(label, roll);
  }
}
