// Modelo de um bloco da rotina e as regras para aceitar dados (digitados ou importados).
//
// Bloco: { id, day (0 = domingo ... 6), start 'HH:MM', end 'HH:MM', title,
//          type: 'fixo' | 'tarefa' | 'rotina', note?, optional?, remind? }

import { toMinutes, blocksForDay } from './schedule.js';

export const TYPES = {
  fixo: {
    label: 'Compromisso',
    hint: 'Aula, trabalho, evento: algo com hora marcada.',
  },
  tarefa: {
    label: 'Tarefa',
    hint: 'Algo que você quer fazer e marcar como feito.',
  },
  rotina: {
    label: 'Rotina',
    hint: 'Acordar, dormir, desacelerar: os marcos do seu dia.',
  },
};

export const TYPE_ORDER = ['fixo', 'tarefa', 'rotina'];

// Antecedência do alarme no Calendário, em minutos (0 = na hora).
export const REMIND_VALUES = [0, 5, 10, 15, 30, 60];

export const REMIND_OPTIONS = [
  { value: '', label: 'Sem lembrete' },
  { value: '0', label: 'Na hora' },
  { value: '5', label: '5 min antes' },
  { value: '10', label: '10 min antes' },
  { value: '15', label: '15 min antes' },
  { value: '30', label: '30 min antes' },
  { value: '60', label: '1 h antes' },
];

// Atalhos para quem está começando do zero.
export const TEMPLATES = [
  { label: 'Acordar', title: 'Acordar', type: 'rotina', remind: 0, minutes: 15 },
  { label: 'Aula', title: 'Aula', type: 'fixo', minutes: 120 },
  { label: 'Trabalho', title: 'Trabalho', type: 'fixo', minutes: 240 },
  { label: 'Almoço', title: 'Almoço', type: 'fixo', minutes: 60 },
  { label: 'Estudo', title: 'Estudo', type: 'tarefa', remind: 10, minutes: 60 },
  { label: 'Academia', title: 'Academia', type: 'tarefa', remind: 30, minutes: 60 },
  { label: 'Dormir', title: 'Dormir', type: 'rotina', remind: 0, minutes: 15 },
];

const TIME_RE = /^([01]\d|2[0-3]):[0-5]\d$/;
export const isTime = (value) => typeof value === 'string' && TIME_RE.test(value);

export const MAX_BLOCKS = 500;
export const MAX_TITLE = 80;
export const MAX_NOTE = 200;

export function newId() {
  return `b${Date.now().toString(36)}${Math.random().toString(36).slice(2, 7)}`;
}

// Converte qualquer coisa em um bloco válido, ou devolve null.
export function sanitizeBlock(raw) {
  if (!raw || typeof raw !== 'object') return null;

  const day = Number(raw.day);
  if (!Number.isInteger(day) || day < 0 || day > 6) return null;
  if (!isTime(raw.start) || !isTime(raw.end)) return null;
  if (toMinutes(raw.end) <= toMinutes(raw.start)) return null;

  const title = typeof raw.title === 'string' ? raw.title.trim().slice(0, MAX_TITLE) : '';
  if (!title) return null;

  // hasOwn: evita que "__proto__" ou "constructor" passem como tipo.
  if (typeof raw.type !== 'string' || !Object.hasOwn(TYPES, raw.type)) return null;

  const block = {
    id: typeof raw.id === 'string' && raw.id && raw.id.length <= 64 ? raw.id : newId(),
    day,
    start: raw.start,
    end: raw.end,
    title,
    type: raw.type,
  };
  if (typeof raw.note === 'string' && raw.note.trim()) block.note = raw.note.trim().slice(0, MAX_NOTE);
  if (raw.optional === true && raw.type === 'tarefa') block.optional = true;
  if (REMIND_VALUES.includes(raw.remind)) block.remind = raw.remind;
  return block;
}

// Limpa uma lista inteira: descarta o inválido, garante ids únicos e limita o tamanho.
export function sanitizeWeek(list) {
  const input = Array.isArray(list) ? list : [];
  const week = [];
  const seen = new Set();
  let skipped = 0;

  for (const raw of input) {
    const block = week.length < MAX_BLOCKS ? sanitizeBlock(raw) : null;
    if (!block) {
      skipped += 1;
      continue;
    }
    if (seen.has(block.id)) block.id = newId();
    seen.add(block.id);
    week.push(block);
  }
  return { week, skipped };
}

// Valida o que a pessoa digitou no editor. Retorna a lista de mensagens de erro.
export function validateDraft({ title, days, start, end }) {
  const errors = [];
  if (!title || !title.trim()) errors.push('Dê um nome ao bloco.');
  if (!days || !days.length) errors.push('Escolha pelo menos um dia.');
  if (!isTime(start) || !isTime(end)) errors.push('Informe o início e o fim.');
  else if (toMinutes(end) <= toMinutes(start)) errors.push('O fim precisa ser depois do início.');
  return errors;
}

// Blocos do mesmo dia que se sobrepõem ao intervalo dado (ignora o próprio bloco).
export function findOverlaps(week, { day, start, end, id }) {
  if (!isTime(start) || !isTime(end) || toMinutes(end) <= toMinutes(start)) return [];
  const s = toMinutes(start);
  const e = toMinutes(end);
  return blocksForDay(week, day).filter(
    (b) => b.id !== id && toMinutes(b.start) < e && s < toMinutes(b.end),
  );
}
