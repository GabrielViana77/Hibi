import { test } from 'node:test';
import assert from 'node:assert/strict';

import { EXAMPLE_WEEK } from '../js/examples.js';
import {
  MAX_BLOCKS,
  findOverlaps,
  sanitizeBlock,
  sanitizeWeek,
  validateDraft,
} from '../js/model.js';
import { blocksForDay, toMinutes } from '../js/schedule.js';
import { FIXTURE_WEEK } from './fixture.js';

const valid = { id: 'x', day: 1, start: '09:00', end: '10:00', title: 'Estudo', type: 'tarefa' };

test('bloco válido passa sem mudar', () => {
  assert.deepEqual(sanitizeBlock(valid), valid);
});

test('rejeita dia, horário, tipo e título inválidos', () => {
  assert.equal(sanitizeBlock({ ...valid, day: 7 }), null);
  assert.equal(sanitizeBlock({ ...valid, day: 1.5 }), null);
  assert.equal(sanitizeBlock({ ...valid, start: '9:00' }), null);
  assert.equal(sanitizeBlock({ ...valid, start: '24:00' }), null);
  assert.equal(sanitizeBlock({ ...valid, end: '09:00' }), null);
  assert.equal(sanitizeBlock({ ...valid, end: '08:00' }), null);
  assert.equal(sanitizeBlock({ ...valid, title: '   ' }), null);
  assert.equal(sanitizeBlock({ ...valid, type: 'outro' }), null);
  assert.equal(sanitizeBlock({ ...valid, type: '__proto__' }), null);
  assert.equal(sanitizeBlock({ ...valid, type: 'constructor' }), null);
  assert.equal(sanitizeBlock(null), null);
  assert.equal(sanitizeBlock('texto'), null);
});

test('título e nota são cortados e limpos; lembrete inválido é descartado', () => {
  const block = sanitizeBlock({
    ...valid,
    title: `  ${'a'.repeat(200)}  `,
    note: 'n'.repeat(500),
    remind: 7,
  });
  assert.equal(block.title.length, 80);
  assert.equal(block.note.length, 200);
  assert.equal('remind' in block, false);
  assert.equal(sanitizeBlock({ ...valid, remind: 30 }).remind, 30);
  assert.equal(sanitizeBlock({ ...valid, remind: 0 }).remind, 0);
});

test('"opcional" só vale para tarefas', () => {
  assert.equal(sanitizeBlock({ ...valid, optional: true }).optional, true);
  assert.equal('optional' in sanitizeBlock({ ...valid, type: 'fixo', optional: true }), false);
});

test('sem id válido, gera um novo', () => {
  const { id, ...rest } = valid;
  assert.match(sanitizeBlock(rest).id, /^b[a-z0-9]+$/);
  assert.match(sanitizeBlock({ ...rest, id: 'x'.repeat(65) }).id, /^b[a-z0-9]+$/);
});

test('texto malicioso fica só como texto (o app nunca usa innerHTML com ele)', () => {
  const block = sanitizeBlock({ ...valid, title: '<img src=x onerror=alert(1)>' });
  assert.equal(block.title, '<img src=x onerror=alert(1)>');
});

test('lista: descarta o inválido, conta os descartados e deduplica ids', () => {
  const { week, skipped } = sanitizeWeek([valid, valid, { ...valid, end: '08:00' }, 42]);
  assert.equal(week.length, 2);
  assert.equal(skipped, 2);
  assert.notEqual(week[0].id, week[1].id);
});

test('lista: respeita o limite de blocos', () => {
  const many = Array.from({ length: MAX_BLOCKS + 20 }, (_, i) => ({ ...valid, id: `id${i}` }));
  const { week, skipped } = sanitizeWeek(many);
  assert.equal(week.length, MAX_BLOCKS);
  assert.equal(skipped, 20);
});

test('lista: entrada que não é lista vira semana vazia', () => {
  assert.deepEqual(sanitizeWeek(undefined), { week: [], skipped: 0 });
  assert.deepEqual(sanitizeWeek({}), { week: [], skipped: 0 });
});

test('editor: valida nome, dias e horários', () => {
  const ok = { title: 'Estudo', days: [1], start: '09:00', end: '10:00' };
  assert.deepEqual(validateDraft(ok), []);
  assert.equal(validateDraft({ ...ok, title: ' ' }).length, 1);
  assert.equal(validateDraft({ ...ok, days: [] }).length, 1);
  assert.equal(validateDraft({ ...ok, end: '09:00' }).length, 1);
  assert.equal(validateDraft({ ...ok, start: '' }).length, 1);
  assert.equal(validateDraft({ title: '', days: [], start: '', end: '' }).length, 3);
});

test('sobreposição: acha conflitos e ignora o próprio bloco e blocos encostados', () => {
  const conflicts = findOverlaps(FIXTURE_WEEK, { day: 1, start: '12:00', end: '13:00' });
  assert.deepEqual(conflicts.map((b) => b.id), ['mon-study-1']);
  assert.deepEqual(findOverlaps(FIXTURE_WEEK, { day: 1, start: '12:00', end: '13:00', id: 'mon-study-1' }), []);
  assert.deepEqual(findOverlaps(FIXTURE_WEEK, { day: 1, start: '12:45', end: '13:30' }), []);
  assert.deepEqual(findOverlaps(FIXTURE_WEEK, { day: 2, start: '12:00', end: '13:00' }), []);
  assert.deepEqual(findOverlaps(FIXTURE_WEEK, { day: 1, start: '13:00', end: '12:00' }), []);
});

test('a semana de exemplo é toda válida, com ids únicos e sem sobreposição', () => {
  const { week, skipped } = sanitizeWeek(EXAMPLE_WEEK);
  assert.equal(skipped, 0);
  assert.equal(week.length, EXAMPLE_WEEK.length);
  assert.equal(new Set(week.map((b) => b.id)).size, week.length);
  for (let day = 0; day < 7; day += 1) {
    const blocks = blocksForDay(week, day);
    assert.ok(blocks.length > 0, `dia ${day} sem blocos`);
    for (let i = 1; i < blocks.length; i += 1) {
      assert.ok(toMinutes(blocks[i - 1].end) <= toMinutes(blocks[i].start), `${blocks[i - 1].id} x ${blocks[i].id}`);
    }
  }
});
