import { test } from 'node:test';
import assert from 'node:assert/strict';

import {
  exportJson,
  loadDone,
  loadState,
  loadTimer,
  parseImport,
  pruneDone,
  saveDone,
  saveState,
  saveTimer,
  setDone,
} from '../js/store.js';
import { FIXTURE_WEEK } from './fixture.js';

const memory = () => {
  const map = new Map();
  return {
    getItem: (k) => (map.has(k) ? map.get(k) : null),
    setItem: (k, v) => map.set(k, String(v)),
    removeItem: (k) => map.delete(k),
  };
};

const at = (y, mo, d, h, mi) => new Date(y, mo - 1, d, h, mi);

test('estado: sem nada salvo devolve null', () => {
  assert.equal(loadState(memory()), null);
});

test('estado: salvar e carregar', () => {
  const storage = memory();
  assert.equal(saveState({ welcomed: true, week: FIXTURE_WEEK }, storage), true);
  const loaded = loadState(storage);
  assert.equal(loaded.welcomed, true);
  assert.deepEqual(loaded.week, FIXTURE_WEEK);
});

test('estado: dado corrompido ou adulterado não derruba o app', () => {
  assert.equal(loadState({ getItem: () => '{nao e json' }), null);
  assert.equal(loadState({ getItem: () => '123' }), null);
  assert.equal(loadState({ getItem: () => '{"week":"x"}' }), null);
  const tampered = JSON.stringify({ week: [{ id: 'a', day: 99, start: 'x', end: 'y', title: 1, type: 'z' }] });
  assert.deepEqual(loadState({ getItem: () => tampered }), { welcomed: false, week: [] });
  assert.equal(saveState({ week: [] }, { setItem: () => { throw new Error('cheio'); } }), false);
});

test('backup: exportar e importar devolve a mesma semana', () => {
  const result = parseImport(exportJson(FIXTURE_WEEK));
  assert.equal(result.ok, true);
  assert.equal(result.skipped, 0);
  assert.deepEqual(result.week, FIXTURE_WEEK);
});

test('backup: aceita também uma lista pura de blocos', () => {
  const result = parseImport(JSON.stringify(FIXTURE_WEEK));
  assert.equal(result.ok, true);
  assert.equal(result.week.length, FIXTURE_WEEK.length);
});

test('backup: rejeita arquivos que não são rotinas e avisa o motivo', () => {
  assert.equal(parseImport('isto não é json').ok, false);
  assert.equal(parseImport('{"foo":1}').ok, false);
  assert.equal(parseImport('[]').ok, false);
  assert.match(parseImport('[{"x":1}]').error, /válido/);
});

test('backup: conta os blocos inválidos que foram pulados', () => {
  const list = [...FIXTURE_WEEK, { id: 'ruim', day: 1, start: '10:00', end: '09:00', title: 'X', type: 'fixo' }];
  const result = parseImport(JSON.stringify({ week: list }));
  assert.equal(result.ok, true);
  assert.equal(result.skipped, 1);
  assert.equal(result.week.length, FIXTURE_WEEK.length);
});

test('feitos: marcar, desmarcar, salvar e carregar', () => {
  const storage = memory();
  let done = loadDone(storage);
  assert.deepEqual(done, {});
  done = setDone(done, '2026-10-30', 'a', true);
  done = setDone(done, '2026-10-30', 'b', true);
  done = setDone(done, '2026-10-30', 'a', false);
  assert.deepEqual(done, { '2026-10-30': { b: true } });
  assert.equal(saveDone(done, storage), true);
  assert.deepEqual(loadDone(storage), done);
});

test('feitos: dado corrompido ou storage quebrado não derruba o app', () => {
  assert.deepEqual(loadDone({ getItem: () => '{nao e json' }), {});
  assert.deepEqual(loadDone({ getItem: () => '123' }), {});
  assert.deepEqual(loadDone({ getItem: () => '[1,2]' }), {});
  assert.equal(saveDone({}, { setItem: () => { throw new Error('cheio'); } }), false);
});

test('feitos: remove dias antigos', () => {
  const done = { '2026-01-01': { a: true }, '2026-10-29': { b: true }, '2026-10-30': { c: true } };
  const pruned = pruneDone(done, at(2026, 10, 30, 12, 0), 30);
  assert.deepEqual(Object.keys(pruned).sort(), ['2026-10-29', '2026-10-30']);
});

test('cronômetro: salvar, carregar e limpar', () => {
  const storage = memory();
  const timer = { blockId: 'a', dateKey: '2026-10-30', mode: 'five', phase: 'running', endsAt: 123 };
  saveTimer(timer, storage);
  assert.deepEqual(loadTimer(storage), timer);
  saveTimer(null, storage);
  assert.equal(loadTimer(storage), null);
  assert.equal(loadTimer({ getItem: () => 'lixo' }), null);
  assert.equal(loadTimer({ getItem: () => '{"blockId":1}' }), null);
});
