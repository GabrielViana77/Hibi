import test from 'node:test';
import assert from 'node:assert/strict';
import { createPomo, resume, pause, leftMs, nextPhase, finished, isFresh, changePreset, formatClock, sanitizePomo } from '../js/pomodoro.js';

const MIN = 60000;

test('começa parado no início do foco', () => {
  const p = createPomo();
  assert.equal(p.phase, 'focus');
  assert.equal(leftMs(p, 0), 25 * MIN);
  assert.ok(isFresh(p));
});

test('rodar, pausar e continuar preserva o tempo', () => {
  let p = resume(createPomo(), 1000);
  assert.equal(leftMs(p, 1000 + 5 * MIN), 20 * MIN);
  p = pause(p, 1000 + 5 * MIN);
  assert.equal(leftMs(p, 1000 + 99 * MIN), 20 * MIN);
  p = resume(p, 5000000);
  assert.equal(p.endsAt, 5000000 + 20 * MIN);
});

test('termina no fim da fase', () => {
  const p = resume(createPomo(), 0);
  assert.equal(finished(p, 25 * MIN - 1), false);
  assert.equal(finished(p, 25 * MIN), true);
});

test('pausa curta depois do foco; longa a cada 4', () => {
  let p = createPomo();
  const phases = [];
  for (let i = 0; i < 4; i++) {
    p = nextPhase(p); // foco -> pausa
    phases.push(p.phase);
    p = nextPhase(p); // pausa -> foco
  }
  assert.deepEqual(phases, ['short', 'short', 'short', 'long']);
  assert.equal(p.phase, 'focus');
  assert.equal(p.cycle, 4);
});

test('trocar duração mantém os ciclos', () => {
  const p = changePreset({ ...createPomo(), cycle: 2 }, 'longo');
  assert.equal(p.preset, 'longo');
  assert.equal(p.cycle, 2);
  assert.equal(leftMs(p, 0), 50 * MIN);
  assert.equal(changePreset(p, '__proto__'), p);
});

test('formatClock', () => {
  assert.equal(formatClock(25 * MIN), '25:00');
  assert.equal(formatClock(61 * 1000 - 1), '01:01');
  assert.equal(formatClock(-5), '00:00');
});

test('sanitizePomo rejeita lixo', () => {
  assert.equal(sanitizePomo(null), null);
  assert.equal(sanitizePomo({ preset: '__proto__', phase: 'focus', cycle: 0, pausedLeft: 1 }), null);
  assert.equal(sanitizePomo({ preset: 'classico', phase: 'constructor', cycle: 0, pausedLeft: 1 }), null);
  assert.equal(sanitizePomo({ preset: 'classico', phase: 'focus', cycle: 0, pausedLeft: null, endsAt: 'x' }), null);
  assert.deepEqual(sanitizePomo({ preset: 'classico', phase: 'short', cycle: 3, pausedLeft: 5, evil: 1 }), {
    preset: 'classico', phase: 'short', cycle: 3, endsAt: 0, pausedLeft: 5,
  });
});
