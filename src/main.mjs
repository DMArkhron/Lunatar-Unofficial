import "./impasse.mjs";
import { addMonsterGenerator, buildMonster } from "./monster-generator.mjs";
import "./file-picker-memory.mjs";
import "./branding.mjs";
import { SYSTEM, PATH, CONDITIONS, SKILLS, testSpec } from "./rules.mjs";
import { itemIcon } from "./catalog.mjs";
import { actorModels, itemModels } from "./models.mjs";
import { LunatarActorSheet, LunatarItemSheet } from "./sheets.mjs";
import { onHotbarDrop, runMacro, useItemMacro } from "./item-actions.mjs";
import { addGeneratorButton, buildCharacter } from "./character-generator.mjs";
import { renderRollCard } from "./chat.mjs";
import { attributeFor, actorModifier, clearTurn, newLunarCycle, startSession, rollTest } from "./actions.mjs";

class LunatarCombatant extends foundry.documents.Combatant {
  _getInitiativeFormula() {
    if (!this.actor?.system.aptidoes) return super._getInitiativeFormula();
    return testSpec(this.actor, "iniciativa", { attribute: "agilidade" }).formula;
  }
}
class LunatarCombat extends foundry.documents.Combat {
  _sortCombatants(a, b) {
    if (a.initiative !== null && a.initiative === b.initiative && a.actor && b.actor) {
      const ranks = (b.actor.system.aptidoes?.iniciativa ?? 0) - (a.actor.system.aptidoes?.iniciativa ?? 0);
      if (ranks) return ranks;
      const agility = (actorModifier(b.actor, "agilidade") ?? 0) - (actorModifier(a.actor, "agilidade") ?? 0);
      if (agility) return agility;
    }
    return super._sortCombatants(a, b);
  }
}

Hooks.once("init", async () => {
  CONFIG.Actor.dataModels = actorModels;
  CONFIG.Item.dataModels = itemModels;
  CONFIG.Combat.documentClass = LunatarCombat;
  CONFIG.Combatant.documentClass = LunatarCombatant;
  CONFIG.Combat.initiative.formula = "1d4";
  const coreStatuses = CONFIG.statusEffects.filter(effect => effect.id === "dead");
  CONFIG.statusEffects = [...coreStatuses, ...Object.entries(CONDITIONS).map(([id, name]) => ({
    id, name, img: `${PATH}/assets/condition.svg`
  }))];
  game.settings.register(SYSTEM, "empate", { scope: "world", config: true, type: String,
    name: "Empate em Teste Oposto", hint: "O playtest apresenta duas orientações na página 7.",
    choices: { oposicao: "Favorece a oposição", acao: "Favorece a ação" }, default: "oposicao" });
  game.settings.register(SYSTEM,"pmPorSessao",{scope:"world",config:true,type:Boolean,default:false,name:"PM apenas no início da sessão",hint:"Regra alternativa do revisor. Desmarcado: recuperação por descanso conforme Playtest V3.",onChange:()=>{for(const a of game.actors)if(a.sheet?.rendered)a.sheet.render();}});
  game.settings.register(SYSTEM,"testeMagia",{scope:"world",config:true,type:Boolean,default:false,name:"Permitir testes de magia sem gastar PM",hint:"Exibe uma opção de teste na rolagem. Desative durante sessões normais."});
  game.settings.register(SYSTEM, "luas", { scope: "world", config: false, type: Array, default: [],
    onChange: () => { for (const actor of game.actors) if (actor.sheet?.rendered) actor.sheet.render(); } });
  const { DocumentSheetConfig } = foundry.applications.apps;
  DocumentSheetConfig.registerSheet(foundry.documents.Actor, SYSTEM, LunatarActorSheet, { makeDefault: true });
  DocumentSheetConfig.registerSheet(foundry.documents.Item, SYSTEM, LunatarItemSheet, { makeDefault: true });
  game.lunatar = { newLunarCycle, startSession, rollTest, skills: SKILLS, attributeFor, runMacro, useItemMacro, buildCharacter, buildMonster };
  await foundry.applications.handlebars.loadTemplates({
    lunatarGroup: `${PATH}/templates/item-group.hbs`,
    lunatarClassProgression: `${PATH}/templates/class-progression.hbs`,
    lunatarInventory: `${PATH}/templates/inventory.hbs`,
    lunatarSpells: `${PATH}/templates/spell-list.hbs`,
    lunatarSpellEditor: `${PATH}/templates/spell-editor.hbs`
  });
});

Hooks.on("preCreateActor", (actor, _data, options) => {
  if (options.keepId || (actor.img && actor.img !== "icons/svg/mystery-man.svg")) return;
  const character = actor.type === "personagem";
  actor.updateSource({ img: `${PATH}/assets/${character ? "moon" : "threat"}.svg`,
    "prototypeToken.actorLink": character });
});

Hooks.on("preCreateItem", item => {
  const img = itemIcon(item);
  if (img !== item.img) item.updateSource({ img });
});

Hooks.on("updateCombat", (combat, changes, _options, userId) => {
  if (userId !== game.user.id || !combat.started || (!("turn" in changes) && !("round" in changes))) return;
  const current = combat.combatant;
  if (!current?.actor?.isOwner) return;
  clearTurn(current.actor, `${combat.id}.${combat.round}.${current.id}`).catch(error => console.error("Lunatar |", error));
});

Hooks.on("renderChatMessageHTML", renderRollCard);
Hooks.on("hotbarDrop", onHotbarDrop);
Hooks.on("renderActorDirectory", addGeneratorButton);


// A criação pelo gerador fica disponível a todas as funções do mundo.
Hooks.once("ready", async () => {
  if (!game.user.isGM || (game.users.activeGM && game.users.activeGM.id !== game.user.id)) return;
  try {
    const permissions = foundry.utils.deepClone(game.settings.get("core", "permissions"));
    const roles = Object.values(CONST.USER_ROLES).filter(role => Number.isInteger(role) && role > 0);
    const allowed = permissions.ACTOR_CREATE ?? [];
    if (roles.every(role => allowed.includes(role))) return;
    permissions.ACTOR_CREATE = [...new Set([...allowed, ...roles])];
    await game.settings.set("core", "permissions", permissions);
  } catch (error) {
    console.error("Lunatar | Permissões do gerador", error);
    ui.notifications.warn("Ative Criar Atores para os jogadores nas permissões do mundo para concluir a criação pelo gerador.");
  }
});

Hooks.on("preUpdateActor",(actor,changes,options,userId)=>{
  if(actor.type!=="personagem"||game.users.get(userId)?.isGM|| (options.lunatarRest && !game.settings.get(SYSTEM,"pmPorSessao")))return;
  const value=changes["system.magia.value"]??changes.system?.magia?.value;
  if(value!==undefined&&Number(value)>actor.system.magia.value){ui.notifications.warn("Use o descanso ou a recuperação definida pelo mestre para recuperar PM.");return false;}
});

Hooks.on("renderActorDirectory",(_app,element)=>{
 if(!game.user.isGM||!game.settings.get(SYSTEM,"pmPorSessao"))return;
 const root=element?.querySelector?element:element?.[0],header=root?.querySelector(".directory-header");
 if(!header||header.querySelector(".ln-session-start"))return;
 const button=document.createElement("button");button.type="button";button.className="ln-session-start";button.textContent="Iniciar sessão · recuperar PM";button.addEventListener("click",()=>startSession().catch(error=>ui.notifications.error(error.message)));header.append(button);
});


Hooks.on("renderActorDirectory", addMonsterGenerator);
