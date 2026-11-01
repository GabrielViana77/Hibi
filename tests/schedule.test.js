import { test } from 'node:test';
import assert from 'node:assert/strict';

import {
  blocksForDay,
  dateKey,
  dayState,
  firstBlockOfNextDay,
  formatDuration,
  fromMinutes,
  layoutDay,
  progress,
  toMinutes,
  weeklyTasks,
} from '../js/schedule.js';
import { FIXTURE_WEEK as WEEK } from './fixture.js';

// Datas locais, sem depender do fuso do computador que roda o teste.
const at = (y, mo, d, h, mi) => new Date(y, mo - 1, d, h, mi);
const MONDAY = (h, mi) => at(2026, 11, 2, h, mi);
const FRIDAY_1531 = at(2026, 10, 30, 15, 31);

test('conversão de horários ida e volta', () => {
  assert.equal(toMinutes('07:10'), 430);
  assert.equal(fromMinutes(430), '07:10');
  assert.equal(formatDuration(280), '4h40');
  assert.equal(formatDuration(45), '45 min');
  assert.equal(formatDuration(120), '2h');
});

test('blocos do dia saem em ordem de horário', () => {
  const blocks = blocksForDay([...WEEK].reverse(), 1);
  assert.equal(blocks.length, 7);
  for (let i = 1; i < blocks.length; i += 1) {
    assert.ok(toMinutes(blocks[i - 1].start) <= toMinutes(blocks[i].start));
  }
});

test('segunda às 11h50: no meio do estudo; a seguir, o curso', () => {
  const state = dayState(WEEK, MONDAY(11, 50));
  assert.equal(state.current?.title, 'Estudo');
  assert.equal(state.next?.title, 'Curso');
});

test('segunda às 11h30: entre blocos, o próximo é o estudo', () => {
  const state = dayState(WEEK, MONDAY(11, 30));
  assert.equal(state.current, null);
  assert.equal(state.next?.title, 'Estudo');
  assert.equal(state.next?.start, '11:45');
});

test('o fim de um bloco já não conta como atual', () => {
  const state = dayState(WEEK, MONDAY(12, 45));
  assert.equal(state.current, null);
  assert.ok(state.past.some((b) => b.id === 'mon-study-1'));
});

test('sexta às 15h31: trabalhando, nada mais hoje; o próximo dia com algo é sábado', () => {
  const state = dayState(WEEK, FRIDAY_1531);
  assert.equal(state.current?.title, 'Trabalho');
  assert.equal(state.next, null);
  const tomorrow = firstBlockOfNextDay(WEEK, FRIDAY_1531);
  assert.equal(tomorrow.day, 6);
  assert.equal(tomorrow.daysAhead, 1);
  assert.equal(tomorrow.block.title, 'Academia');
});

test('semana vazia: nada atual, nada próximo, nenhum próximo dia', () => {
  const state = dayState([], MONDAY(10, 0));
  assert.equal(state.current, null);
  assert.equal(state.next, null);
  assert.equal(firstBlockOfNextDay([], MONDAY(10, 0)), null);
});

test('progresso conta só tarefas', () => {
  const blocks = blocksForDay(WEEK, 1);
  assert.deepEqual(
    [progress(blocks, {}).done, progress(blocks, {}).total],
    [0, 3],
  );
  const some = progress(blocks, { 'mon-gym': true, 'id-que-nao-existe': true });
  assert.deepEqual([some.done, some.total], [1, 3]);
  assert.ok(Math.abs(some.ratio - 1 / 3) < 1e-9);
  assert.equal(progress([], {}).ratio, 0);
});

test('tarefas da semana: obrigatório e opcional', () => {
  const tasks = weeklyTasks(WEEK);
  // 60 + 75 + 60 (seg) + 75 (sáb) + 15 (dom)
  assert.equal(tasks.required, 285);
  assert.equal(tasks.optional, 40);
  assert.equal(tasks.total, 325);
});

test('dateKey usa a data local', () => {
  assert.equal(dateKey(at(2026, 1, 5, 23, 59)), '2026-01-05');
});

test('grade: blocos que se sobrepõem ficam lado a lado', () => {
  const day = [
    { id: 'a', start: '09:00', end: '10:00' },
    { id: 'b', start: '09:30', end: '10:30' },
    { id: 'c', start: '11:00', end: '12:00' },
  ];
  const byId = Object.fromEntries(layoutDay(day).map((p) => [p.block.id, p]));
  assert.deepEqual([byId.a.lane, byId.a.lanes], [0, 2]);
  assert.deepEqual([byId.b.lane, byId.b.lanes], [1, 2]);
  assert.deepEqual([byId.c.lane, byId.c.lanes], [0, 1]);
});

test('grade: blocos encostados (fim = início) não competem por faixa', () => {
  const day = [
    { id: 'a', start: '09:00', end: '10:00' },
    { id: 'b', start: '10:00', end: '11:00' },
  ];
  for (const p of layoutDay(day)) assert.deepEqual([p.lane, p.lanes], [0, 1]);
});
