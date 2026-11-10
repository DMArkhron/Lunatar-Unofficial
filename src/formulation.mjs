import { CLASSES } from "./rules.mjs";
import { MAGIC, AMPLIFICATIONS } from "./catalog.mjs";
import { prompt } from "./actions.mjs";

const amplificationDetails = {
  "Condição": "Acrescenta uma condição. Registre qual nas notas.",
  "Direcionar": "Limita a formulação a um alvo.",
  "Duradoura": "Prolonga a duração em uma rodada.",
  "Intensa": "Soma novamente a Característica de Formulação ao dano.",
  "Precisa": "Concede um Trunfo na conjuração.",
  "Silenciosa": "Permite conjurar sem verbalizar.",
  "Aumentada": "Acrescenta um dado de dano do mesmo tipo.",
  "Especialista": "Combina duas Palavras diferentes.",
  "Múltipla": "Acrescenta um alvo. Alvos adicionais recebem apenas o dano.",
  "Rápida": "Reduz o custo da conjuração para uma ação."
};

function formulation(data, { forms, words, amps, limit }) {
  const form = forms[data.form];
  const word = words[data.word];
  if (!form || !word) return { error: "Escolha uma Forma e uma Palavra." };
  const used = amps.filter((_, i) => data[`amp-${i}`] === "on");
  const has = name => used.some(([label]) => label === name);
  const extra = has("Especialista") ? words[data.extra] : null;
  const notes = [word[3], extra?.[3], data.notes?.trim()].filter(Boolean);
  let error = "";
  if (used.length > limit) error = "Quantidade de Ampliações acima do limite da classe.";
  else if (has("Especialista") && (!extra || extra === word)) error = "Especialista requer outra Palavra.";
  else if (has("Condição") && !data.notes?.trim()) error = "Registre a Condição escolhida nas notas.";

  let damage = [word[2], extra?.[2]].filter(Boolean).join(" + ");
  if (damage && has("Aumentada")) damage = damage.replace(/^(\d+)d/, (_, count) => `${Number(count) + 1}d`);
  if (damage && has("Intensa")) damage += " + @formulacao";
  if (has("Duradoura")) notes.push("Ampliação: +1 rodada de duração.");
  if (has("Direcionar")) notes.push("Ampliação: afeta somente um alvo.");
  if (has("Múltipla")) notes.push("Ampliação: +1 alvo; alvos subsequentes recebem somente o dano.");
  return {
    error, item: {
      type: "formulacao", name: data.name?.trim() || [form[0], word[0], extra?.[0]].filter(Boolean).join(" · "),
      system: {
        forma: form[0], palavra: word[0], palavraExtra: extra?.[0] ?? "",
        ampliacao: used.map(([label]) => label).join(", "), custoForma: form[1], custoPalavra: word[1],
        custoExtra: (extra?.[1] ?? 0) + Math.max(0, Math.trunc(Number(data.pm) || 0)),
        alcance: form[2], alvos: has("Direcionar") ? "1" : form[3],
        reflexo: used.reduce((sum, [, cost]) => sum + cost, 0), custoAcao: has("Rápida") ? 1 : 2,
        trunfos: Number(has("Precisa")), dano: damage, ataqueMagico: Boolean(damage) || data.attack === "on",
        duracao: data.duration?.trim() ?? "", controle: data.control === "on", descricao: notes.join("\n")
      }
    }
  };
}

function configureComposer(dialog, catalog, actor) {
  const panel = dialog.element.querySelector(".ln-composer");
  const form = panel.closest("form");
  const amplifications = [...panel.querySelectorAll("[data-amplification]")];
  const extra = form.elements.namedItem("extra");
  const submit = dialog.element.querySelector('button[data-action="ok"], button[type="submit"]');
  const output = Object.fromEntries([...panel.querySelectorAll("[data-spell-preview]")]
    .map(element => [element.dataset.spellPreview, element]));
  const refresh = () => {
    const picked = amplifications.filter(input => input.checked);
    for (const input of amplifications) input.disabled = !input.checked && picked.length >= catalog.limit;
    output.count.textContent = `${picked.length}/${catalog.limit} selecionadas`;
    if (extra) {
      const active = picked.some(input => input.dataset.amplification === "Especialista");
      extra.disabled = !active;
      extra.closest("label").hidden = !active;
      const currentWord = form.elements.namedItem("word").value;
      for (const option of extra.options) option.disabled = option.value === currentWord;
      if (extra.value === currentWord) extra.value = "";
    }
    const { error, item } = formulation(Object.fromEntries(new FormData(form)), catalog);
    if (submit) submit.disabled = Boolean(error);
    output.error.textContent = error;
    output.error.hidden = !error;
    if (!item) return;
    const s = item.system;
    const total = s.custoForma + s.custoPalavra + s.custoExtra;
    output.name.textContent = item.name;
    output.pm.textContent = `${total} PM`;
    output.pm.classList.toggle("ln-over-budget", total > actor.system.magia.value);
    output.reflex.textContent = s.reflexo ? `${s.reflexo}d4 PS` : "0 PS";
    output.actions.textContent = String(s.custoAcao);
    output.range.textContent = s.alcance || "—";
    output.targets.textContent = s.alvos || "—";
    output.damage.textContent = s.dano.replaceAll("@formulacao", "Formulação") || "—";
    output.test.textContent = s.ataqueMagico ? "Ataque Mágico" : catalog.test;
    output.effect.textContent = s.descricao;
    output.effect.hidden = !s.descricao;
  };
  panel.addEventListener("input", refresh);
  panel.addEventListener("change", refresh);
  refresh();
}

export async function compose(actor) {
  const s = actor.system;
  const base = MAGIC[s.classe];
  if (!base) throw new Error("Escolha uma classe conjuradora ou crie uma formulação personalizada.");
  const klass = CLASSES[s.classe];
  const superior = s.nivel >= 5 && Boolean(klass.paths[s.trilha]);
  const path = superior ? MAGIC[s.trilha] : null;
  const catalog = {
    forms: [...base.forms, ...(path?.forms ?? [])],
    words: [...base.words, ...(path?.words ?? [])],
    amps: AMPLIFICATIONS.filter(([, , advanced]) => superior || !advanced),
    limit: superior ? 2 : 1,
    test: { adepto: "Teurgia", mistico: "Misticismo", naturalista: "Natureza" }[s.classe]
  };
  const data = await prompt("Compor formulação", "magic-dialog", {
    forms: catalog.forms.map(([label, cost, range, targets], id) => ({ id, label, cost, range, targets })),
    words: catalog.words.map(([label, cost], id) => ({ id, label, cost })),
    amps: catalog.amps.map(([label, cost], id) => ({ id, label, cost, detail: amplificationDetails[label] })),
    superior, available: s.magia.value, spellClass: klass.label
  }, "Salvar formulação", {
    classes: ["lunatar", "lunatar-roll-dialog", "lunatar-composer-dialog"], position: { width: 700 },
    render: (_event, dialog) => configureComposer(dialog, catalog, actor)
  });
  if (!data) return;
  const { error, item } = formulation(data, catalog);
  if (error) throw new Error(error);
  const [created] = await actor.createEmbeddedDocuments("Item", [item]);
  return created?.sheet.render({ force: true });
}
