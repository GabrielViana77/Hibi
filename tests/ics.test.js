import { test } from 'node:test';
import assert from 'node:assert/strict';

import { buildIcs, escapeText, fold, nextDateForDay } from '../js/ics.js';
import { FIXTURE_WEEK as WEEK } from './fixture.js';

const FROM = new Date(2026, 9, 30, 16, 0); // sexta, 30/10/2026
const NOW = new Date(Date.UTC(2026, 9, 30, 19, 0, 0));

const ics = buildIcs(WEEK, { from: FROM, now: NOW });
const lines = ics.split('\r\n');

test('estrutura do calendário', () => {
  assert.equal(lines[0], 'BEGIN:VCALENDAR');
  assert.equal(lines[lines.length - 2], 'END:VCALENDAR');
  assert.equal(lines[lines.length - 1], '');
  assert.ok(ics.includes('TZID:America/Sao_Paulo'));
});

test('um evento e um alarme para cada bloco com lembrete', () => {
  const expected = WEEK.filter((b) => b.remind !== undefined).length;
  assert.ok(expected > 0);
  assert.equal(lines.filter((l) => l === 'BEGIN:VEVENT').length, expected);
  assert.equal(lines.filter((l) => l === 'END:VEVENT').length, expected);
  assert.equal(lines.filter((l) => l === 'BEGIN:VALARM').length, expected);
});

test('blocos sem lembrete (aulas, trabalho) não viram evento', () => {
  assert.ok(!ics.includes('Aulas'));
  assert.ok(!ics.includes('Trabalho'));
});

test('semana sem nenhum lembrete gera calendário válido e vazio', () => {
  const empty = buildIcs([], { from: FROM, now: NOW });
  assert.ok(empty.startsWith('BEGIN:VCALENDAR'));
  assert.ok(!empty.includes('BEGIN:VEVENT'));
});

test('segunda-feira: estudo das 11:45 começa em 02/11 e repete toda segunda', () => {
  const start = lines.indexOf('UID:mon-study-1@hibi.app');
  assert.ok(start >= 0);
  const event = lines.slice(start, start + 8);
  assert.ok(event.includes('DTSTART;TZID=America/Sao_Paulo:20261102T114500'));
  assert.ok(event.includes('DTEND;TZID=America/Sao_Paulo:20261102T124500'));
  assert.ok(event.includes('RRULE:FREQ=WEEKLY;BYDAY=MO'));
  assert.ok(lines.includes('TRIGGER:-PT10M'));
  assert.ok(lines.includes('TRIGGER:PT0S'));
});

test('um evento do próprio dia entra hoje mesmo', () => {
  const sexta = nextDateForDay(5, FROM);
  assert.equal(sexta.getDate(), 30);
  const domingo = nextDateForDay(0, FROM);
  assert.equal(domingo.getDate(), 1);
  assert.equal(domingo.getMonth(), 10);
});

test('blocos opcionais ficam identificados no título', () => {
  assert.ok(ics.includes('SUMMARY:Hibi · Estudo (opcional)'));
});

test('vírgula e ponto e vírgula no texto são escapados', () => {
  assert.ok(ics.includes('DESCRIPTION:Leve a roupa\\, e a garrafa\\; ok?'));
});

test('nenhuma linha passa de 75 octetos', () => {
  const encoder = new TextEncoder();
  for (const line of lines) assert.ok(encoder.encode(line).length <= 75, line);
});

test('dobra de linha preserva o conteúdo e não corta acentos', () => {
  const original = `DESCRIPTION:${'ação '.repeat(40)}`;
  const folded = fold(original);
  assert.ok(folded.includes('\r\n '));
  assert.equal(folded.replace(/\r\n /g, ''), original);
});

test('escape de texto', () => {
  assert.equal(escapeText('a,b;c\\d\ne'), 'a\\,b\\;c\\\\d\\ne');
});
