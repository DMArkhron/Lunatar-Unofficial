import { equipmentSlots } from "./equipment.mjs";
import { ATTRIBUTES, SKILLS, CLASSES, ORIGINS, healthBase, magicBase, defenseBase, clamp } from "./rules.mjs";

const { NumberField, StringField, BooleanField, SchemaField, ObjectField } = foundry.data.fields;
const Base = foundry.abstract.TypeDataModel;
const number = (initial = 0, min = 0, max) => new NumberField({
  required: true, nullable: false, integer: true, initial, min, ...(max === undefined ? {} : { max })
});
const override = (min = 0) => new NumberField({ nullable: true, initial: null, integer: true, min });
const str = (initial = "") => new StringField({ required: true, nullable: false, initial });
const bool = (initial = false) => new BooleanField({ required: true, nullable: false, initial });
const schema = fields => new SchemaField(fields);
const pool = (value, max) => schema({ value: number(value), max: number(max) });
const abilityFields = () => Object.fromEntries(Object.keys(SKILLS).map(key => [key, number(0, 0, 6)]));
const common = () => ({
  nivel: number(1, 1, 12),
  saude: pool(1, 1), magia: pool(0, 0), acoes: pool(3, 3),
  movimento: number(5), defesa: number(), defesaMagica: number(), protecao: number(),
  equipagem: schema({ configurada: bool(), esquerda: str(), direita: str(), corpo: str() }),
  aptidoes: schema(abilityFields()),
  notas: str(), marcas: str(), turno: str(), repeticoes: new ObjectField({ initial: {} })
});

class Personagem extends Base {
  static defineSchema() {
    return {
      ...common(), classe: str(), origem: str(), trilha: str(), trilhaNatureza: str(),
      lua: number(0, 0, 12), dadoLunar: number(1), desafios: number(),
      defAtributo: str("corpo"), wardAtributo: str("instinto"), formulacaoAtributo: str("instinto"),
      caracteristicas: schema(Object.fromEntries(Object.keys(ATTRIBUTES).map(key => [key, number(1, 0, 5)]))),
      maestrias: schema(Object.fromEntries(Object.keys(SKILLS).map(key => [key, str()]))),
      moedas: schema({ solares: number(), lunares: number(), estelares: number() }),
      manual: schema({
        saude: override(1), magia: override(), defesa: override(), defesaMagica: override(), protecao: override()
      }),
      ajuste: schema({ saude: number(0, -999), magia: number(0, -999), movimento: number(0, -99),
        defesa: number(0, -99), defesaMagica: number(0, -99), protecao: number(0, -99) })
    };
  }

  prepareDerivedData() {
    const equippedIds = this.equipagem?.configurada ? Object.values(equipmentSlots(this.parent)) : null;
    const armor = this.parent.items.filter(item => item.type === "armadura"
      && (equippedIds ? equippedIds.includes(item.id) : item.system.equipado));
    const worn = armor.filter(item => !item.system.escudo);
    const shields = armor.filter(item => item.system.escudo);
    const highest = (items, key) => Math.max(0, ...items.map(item => item.system[key]));
    const klass = CLASSES[this.classe];
    const natural = this.classe === "naturalista" ? this.trilhaNatureza : "";
    const light = !highest(worn, "fardos");
    this.automaticStats = {
      saude: Math.max(1, (klass ? healthBase(this) : this.saude.max) + this.ajuste.saude),
      magia: Math.max(0, (klass ? magicBase(this) : this.magia.max) + this.ajuste.magia),
      defesa: Math.max(0, (klass ? defenseBase(this, "def") : this.defesa)
        + this.ajuste.defesa + highest(shields, "defesa")),
      defesaMagica: Math.max(0, (klass ? defenseBase(this, "ward") : this.defesaMagica) + this.ajuste.defesaMagica),
      protecao: Math.max(0, this.protecao + this.ajuste.protecao + highest(worn, "protecao")
        + (natural === "conexao" && light ? 1 : 0))
    };
    this.saude.max = this.manual.saude ?? this.automaticStats.saude;
    this.magia.max = this.manual.magia ?? this.automaticStats.magia;
    for (const key of ["defesa", "defesaMagica", "protecao"]) this[key] = this.manual[key] ?? this.automaticStats[key];
    for (const key of ["saude", "magia", "acoes"]) this[key].value = clamp(this[key].value, 0, this[key].max);
    this.movimento = Math.max(0, (ORIGINS[this.origem]?.[1] ?? this.movimento) + this.ajuste.movimento
      + (natural === "cacada" ? 3 : 0));
    this.fardoArmadura = highest(worn, "fardos");
  }
}

class Ameaca extends Base {
  static defineSchema() {
    return {
      ...common(), categoria: str(), concreto: number(0, -99), abstrato: number(0, -99),
      formulacaoAtributo: str("instinto")
    };
  }
  prepareDerivedData() {
    for (const key of ["saude", "magia", "acoes"]) this[key].value = clamp(this[key].value, 0, this[key].max);
  }
}

const itemCommon = () => ({ descricao: str(), referencia: str() });
class Arma extends Base {
  static defineSchema() {
    return { ...itemCommon(), aptidao: str("ataque"), dano: str("1d6"), atributoDano: str("forca"),
      bonus: number(0, -99), alcance: number(), propriedades: str(), custoAcao: number(1),
      perfurante: bool(), duasMaos: bool(), mortifera: bool(), versatil: bool(), bruta: number(),
      adicionarAtributo: bool(true) };
  }
}
class Armadura extends Base {
  static defineSchema() {
    return { ...itemCommon(), equipado: bool(false), escudo: bool(false),
      defesa: number(), protecao: number(), fardos: number() };
  }
}
class Equipamento extends Base {
  static defineSchema() { return { ...itemCommon(), quantidade: number(1) }; }
}
class Traco extends Base {
  static defineSchema() { return { ...itemCommon(), origem: str(), custoAcao: number() }; }
}
class Proeza extends Base {
  static defineSchema() {
    return { ...itemCommon(), custoAcao: number(1), tipoAcao: str("Ação"),
      usos: number(), maxUsos: number(), recuperar: bool(), fonte: str(), recarga: str() };
  }
}
class Classe extends Base {
  static defineSchema() {
    return { ...itemCommon(), classe: str(), trilha: str(), nivel: number(1, 1, 12),
      saude: str(), defesa: str(), defesaMagica: str(), conjuracao: str(), equipamento: str() };
  }
}
class Formulacao extends Base {
  static defineSchema() {
    return {
      ...itemCommon(), forma: str(), palavra: str(), palavraExtra: str(), ampliacao: str(),
      custoForma: number(), custoPalavra: number(), custoExtra: number(), reflexo: number(),
      custoAcao: number(2), alcance: str(), alvos: str(), duracao: str(), dano: str(),
      ataqueMagico: bool(), trunfos: number(0, 0, 2), controle: bool()
    };
  }
}
export const actorModels = { personagem: Personagem, ameaca: Ameaca };
export const itemModels = { arma: Arma, armadura: Armadura, equipamento: Equipamento,
  proeza: Proeza, traco: Traco, classe: Classe, formulacao: Formulacao };
