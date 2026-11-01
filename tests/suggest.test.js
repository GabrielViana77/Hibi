import test from 'node:test';
import assert from 'node:assert/strict';
import { isStudy, greeting, dayStats, streak, suggestions, pickByDay, PHRASES } from '../js/suggest.js';
import { dateKey } from '../js/schedule.js';

const blk = (id, start, end, title, type, extra = {}) => ({ id, day: 1, start, end, title, type, ...extra });
const at = (h, m = 0) => new Date(2026, 10, 2, h, m); // segunda-feira, 2 nov 2026

test('isStudy só vale para tarefas de estudo', () => {
  assert.equal(isStudy(blk('a', '10:00', '11:00', 'Estudo', 'tarefa')), true);
  assert.equal(isStudy(blk('a', '10:00', '11:00', 'Estudo', 'fixo')), false);
  assert.equal(isStudy(blk('a', '10:00', '11:00', 'Academia', 'tarefa')), false);
  assert.equal(isStudy(null), false);
});

test('saudação por hora', () => {
  assert.equal(greeting(at(8)), 'Bom dia');
  assert.equal(greeting(at(15)), 'Boa tarde');
  assert.equal(greeting(at(21)), 'Boa noite');
});

test('dayStats conta tarefas e tempo livre', () => {
  const blocks = [blk('a', '08:00', '10:00', 'Aulas', 'fixo'), blk('b', '12:00', '13:00', 'Estudo', 'tarefa'), blk('c', '14:00', '15:00', 'Academia', 'tarefa')];
  const st = dayStats(blocks, { b: true }, at(10, 30));
  assert.equal(st.tasksTotal, 2);
  assert.equal(st.tasksDone, 1);
  assert.equal(st.doneMinutes, 60);
  assert.equal(st.freeMinutes, 270 - 120); // 10:30–15:00 menos 2h de blocos
});

test('streak conta dias seguidos terminando hoje ou ontem', () => {
  const now = at(12);
  const done = { '2026-11-01': { x: true }, '2026-10-31': { x: true }, '2026-10-29': { x: true } };
  assert.equal(streak(done, now, dateKey), 2);
  assert.equal(streak({ ...done, '2026-11-02': { y: true } }, now, dateKey), 3);
  assert.equal(streak({}, now, dateKey), 0);
});

test('sugestões: estudo agora, e no máximo 3', () => {
  const week = [blk('a', '10:00', '11:00', 'Estudo', 'tarefa'), blk('b', '12:00', '13:00', 'Academia', 'tarefa')];
  const list = suggestions(week, {}, at(10, 15));
  assert.ok(list.length >= 1 && list.length <= 3);
  assert.match(list[0].title, /estudar/i);
});

test('sugestões: tarefa que passou do horário e vazio', () => {
  const week = [blk('a', '08:00', '09:00', 'Academia', 'tarefa')];
  assert.match(suggestions(week, {}, at(12))[0].text, /Academia/);
  assert.ok(suggestions([], {}, at(12)).length === 1);
});

test('frase do dia é estável no mesmo dia', () => {
  assert.equal(pickByDay(PHRASES, at(8)), pickByDay(PHRASES, at(22)));
});
