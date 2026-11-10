import { readFile, writeFile, mkdir, mkdtemp, rm, readdir } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import assert from 'node:assert/strict';
import { compilePack, extractPack } from '@foundryvtt/foundryvtt-cli';
import { SKILLS, CONCRETE, testSpec } from '../src/rules.mjs';

const root = new URL('../', import.meta.url);
const { actors, folders } = JSON.parse(await readFile(new URL('pack-source/bestiario.json', root), 'utf8'));
assert.equal(actors.length, 6);
const ids = new Set([...actors, ...folders].map(x => x._id));
assert.equal(ids.size, 10);
const expected = {
  'Aranha Gigante': [10, 5, 4, 1, [['Mordida', 12, 1, '1d6+1']]],
  'Alpa Combatente': [50, 10, 9, 3, [['Lâmina', 16, 4, '1d12+4'], ['Balestra', 12, 4, '1d8+4']]],
  'Conjurador': [30, 8, 11, 1, [['Rajada Mística', 12, 4, '1d6']]],
  'Devorado': [10, 5, 6, 1, [['Garras Sombrias', 10, 1, '1d6+1']]],
  'Guardião da Culpa': [110, 10, 10, 5, [['Espada do pesar', 16, 7, '2d10+7']]],
  'Mercenário': [25, 9, 8, 3, [['Lança', 12, 3, '2d6+3']]]
};
for (const actor of actors) {
  const s = actor.system;
  const [hp, def, ward, protection, attacks] = expected[actor.name];
  assert.deepEqual([s.saude.max, s.defesa, s.defesaMagica, s.protecao], [hp, def, ward, protection]);
  assert.equal(s.saude.value, hp);
  assert.ok(folders.some(f => f._id === actor.folder));
  assert.equal(actor.prototypeToken.actorLink, false);
  assert.deepEqual(Object.keys(s.aptidoes).sort(), Object.keys(SKILLS).sort());
  for (const [name, die, mod, damage] of attacks) {
    const item = actor.items.find(i => i.name === name);
    assert.ok(item, name);
    const attribute = SKILLS[item.system.aptidao][1] || s.formulacaoAtributo;
    const spec = testSpec(actor, item.system.aptidao, { attribute });
    assert.equal(spec.die, die, name);
    assert.equal(spec.mod, mod, name);
    const flat = item.system.bonus + item.system.bruta;
    assert.equal(item.system.dano + (flat ? `+${flat}` : ''), damage, name);
    assert.equal(item.system.adicionarAtributo, false, 'Não somar o atributo duas vezes');
    if (item.system.perfurante) assert.equal(item.system.bonus, 1);
  }
}
const temp = await mkdtemp(path.join(tmpdir(), 'lunatar-bestiary-'));
try {
  const input = path.join(temp, 'input');
  const output = path.join(temp, 'roundtrip');
  await mkdir(input);
  for (const [collection, docs] of [['actors', actors], ['folders', folders]]) {
    for (const doc of docs) {
      const packed = structuredClone(doc);
      packed._key = `!${collection}!${doc._id}`;
      for (const item of packed.items ?? []) item._key = `!actors.items!${doc._id}.${item._id}`;
      await writeFile(path.join(input, doc._id + '.json'), JSON.stringify(packed));
    }
  }
  const dest = new URL('packs/bestiario', root).pathname;
  await compilePack(input, dest);
  await extractPack(dest, output);
  const unpacked = await Promise.all((await readdir(output)).map(async file => JSON.parse(await readFile(path.join(output, file), 'utf8'))));
  assert.equal(unpacked.filter(x => x.type === 'ameaca').length, 6);
  for (const actor of actors) {
    const result = unpacked.find(x => x._id === actor._id);
    assert.deepEqual(result.system, actor.system);
    assert.deepEqual(result.items.map(({ _key, ...item }) => item), actor.items);
  }
  console.log('Bestiário validado: 6 ameaças, 4 pastas e 16 itens. Rolagens e dados preservados após compilar/extrair.');
} finally { await rm(temp, { recursive: true, force: true }); }
