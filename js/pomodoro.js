// Lógica do Pomodoro (sem DOM): ciclos de foco e pausa, com `now` em milissegundos injetado.
// Estado: { preset, phase: 'focus'|'short'|'long', cycle, endsAt, pausedLeft }
//   - rodando: pausedLeft === null e endsAt é o fim da fase
//   - parado/pausado: pausedLeft guarda os milissegundos que faltam

export const PRESETS = {
  classico: { label: '25 + 5', focus: 25, short: 5, long: 15 },
  longo: { label: '50 + 10', focus: 50, short: 10, long: 25 },
};
export const DEFAULT_PRESET = 'classico';
export const CYCLES_BEFORE_LONG = 4;

export const PHASE_LABEL = { focus: 'Foco', short: 'Pausa curta', long: 'Pausa longa' };

const minutesOf = (preset, phase) => PRESETS[preset][phase] * 60000;

// Cria um pomodoro pronto para começar (ainda parado).
export function createPomo(preset = DEFAULT_PRESET) {
  const key = Object.hasOwn(PRESETS, preset) ? preset : DEFAULT_PRESET;
  return { preset: key, phase: 'focus', cycle: 0, endsAt: 0, pausedLeft: minutesOf(key, 'focus') };
}

export const isRunning = (p) => p.pausedLeft === null;

export const leftMs = (p, now) => (isRunning(p) ? Math.max(0, p.endsAt - now) : p.pausedLeft);

// Parado no início da fase (ainda não começou) ou pausado no meio.
export const isFresh = (p) => !isRunning(p) && p.pausedLeft === minutesOf(p.preset, p.phase);

export function resume(p, now) {
  return isRunning(p) ? p : { ...p, endsAt: now + p.pausedLeft, pausedLeft: null };
}

export function pause(p, now) {
  return isRunning(p) ? { ...p, pausedLeft: leftMs(p, now), endsAt: 0 } : p;
}

// Fase seguinte, parada e pronta para começar. Depois de cada foco, conta um ciclo;
// a cada 4 focos a pausa é longa.
export function nextPhase(p) {
  if (p.phase === 'focus') {
    const cycle = p.cycle + 1;
    const phase = cycle % CYCLES_BEFORE_LONG === 0 ? 'long' : 'short';
    return { ...p, phase, cycle, endsAt: 0, pausedLeft: minutesOf(p.preset, phase) };
  }
  return { ...p, phase: 'focus', endsAt: 0, pausedLeft: minutesOf(p.preset, 'focus') };
}

export function changePreset(p, preset) {
  if (!Object.hasOwn(PRESETS, preset)) return p;
  return { ...createPomo(preset), cycle: p.cycle };
}

export const finished = (p, now) => isRunning(p) && now >= p.endsAt;

export function formatClock(ms) {
  const total = Math.max(0, Math.ceil(ms / 1000));
  return `${String(Math.floor(total / 60)).padStart(2, '0')}:${String(total % 60).padStart(2, '0')}`;
}

// Valida o que veio do localStorage.
export function sanitizePomo(raw) {
  if (!raw || typeof raw !== 'object') return null;
  if (!Object.hasOwn(PRESETS, raw.preset) || !Object.hasOwn(PHASE_LABEL, raw.phase)) return null;
  const cycle = Number.isInteger(raw.cycle) && raw.cycle >= 0 && raw.cycle < 1000 ? raw.cycle : 0;
  const running = raw.pausedLeft === null;
  if (running && !Number.isFinite(raw.endsAt)) return null;
  if (!running && !(Number.isFinite(raw.pausedLeft) && raw.pausedLeft >= 0)) return null;
  return {
    preset: raw.preset,
    phase: raw.phase,
    cycle,
    endsAt: running ? raw.endsAt : 0,
    pausedLeft: running ? null : raw.pausedLeft,
  };
}
