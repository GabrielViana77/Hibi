// Persistência local (localStorage). Tudo fica no aparelho: sem conta, sem servidor.
// As funções recebem o `storage` como parâmetro para poderem ser testadas sem navegador.

import { MAX_BLOCKS, sanitizeWeek } from './model.js';

const STATE_KEY = 'hibi:v2:state';
const DONE_KEY = 'hibi:v1:done';
const TIMER_KEY = 'hibi:v1:timer';

const local = () => globalThis.localStorage;

// ---------- Estado do app (a semana e se a pessoa já viu a apresentação) ----------

export function loadState(storage = local()) {
  try {
    const raw = storage?.getItem(STATE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (!parsed || typeof parsed !== 'object' || !Array.isArray(parsed.week)) return null;
    return { welcomed: parsed.welcomed === true, week: sanitizeWeek(parsed.week).week };
  } catch {
    return null;
  }
}

export function saveState(state, storage = local()) {
  try {
    storage?.setItem(
      STATE_KEY,
      JSON.stringify({ v: 2, welcomed: state.welcomed === true, week: state.week }),
    );
    return true;
  } catch {
    return false;
  }
}

// ---------- Backup: exportar e importar a rotina ----------

export function exportJson(week) {
  return JSON.stringify({ app: 'hibi', v: 2, exportedAt: new Date().toISOString(), week }, null, 2);
}

export function parseImport(text) {
  let data;
  try {
    data = JSON.parse(text);
  } catch {
    return { ok: false, error: 'Esse arquivo não é um JSON válido.' };
  }
  const list = Array.isArray(data) ? data : data?.week;
  if (!Array.isArray(list)) return { ok: false, error: 'Esse arquivo não parece uma rotina do Hibi.' };
  if (list.length > MAX_BLOCKS) return { ok: false, error: `Blocos demais (o limite é ${MAX_BLOCKS}).` };

  const { week, skipped } = sanitizeWeek(list);
  if (!week.length) return { ok: false, error: 'Nenhum bloco válido foi encontrado no arquivo.' };
  return { ok: true, week, skipped };
}

// ---------- Marcações de "feito" ----------
// Formato: { "2026-10-30": { "<idDoBloco>": true } }

export function loadDone(storage = local()) {
  try {
    const raw = storage?.getItem(DONE_KEY);
    const parsed = raw ? JSON.parse(raw) : {};
    return parsed && typeof parsed === 'object' && !Array.isArray(parsed) ? parsed : {};
  } catch {
    return {};
  }
}

export function saveDone(done, storage = local()) {
  try {
    storage?.setItem(DONE_KEY, JSON.stringify(done));
    return true;
  } catch {
    return false;
  }
}

export function setDone(done, dateKey, blockId, value) {
  const day = { ...(done[dateKey] ?? {}) };
  if (value) day[blockId] = true;
  else delete day[blockId];
  return { ...done, [dateKey]: day };
}

// Mantém só os últimos `keepDays` dias (as chaves AAAA-MM-DD ordenam como texto).
export function pruneDone(done, today, keepDays = 90) {
  const cutoff = new Date(today.getFullYear(), today.getMonth(), today.getDate() - keepDays);
  const cutoffKey = [
    cutoff.getFullYear(),
    String(cutoff.getMonth() + 1).padStart(2, '0'),
    String(cutoff.getDate()).padStart(2, '0'),
  ].join('-');
  return Object.fromEntries(Object.entries(done).filter(([key]) => key >= cutoffKey));
}

// ---------- Cronômetro em andamento ----------

export function loadTimer(storage = local()) {
  try {
    const t = JSON.parse(storage?.getItem(TIMER_KEY));
    return t && typeof t.blockId === 'string' && Number.isFinite(t.endsAt) ? t : null;
  } catch {
    return null;
  }
}

export function saveTimer(timer, storage = local()) {
  try {
    if (timer) storage?.setItem(TIMER_KEY, JSON.stringify(timer));
    else storage?.removeItem(TIMER_KEY);
    return true;
  } catch {
    return false;
  }
}
