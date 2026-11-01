// Lógica pura da agenda: sem DOM, sem relógio global. Tudo recebe `now` por parâmetro,
// o que torna os testes simples e determinísticos.

export const DAY_NAMES = [
  'Domingo',
  'Segunda-feira',
  'Terça-feira',
  'Quarta-feira',
  'Quinta-feira',
  'Sexta-feira',
  'Sábado',
];

export const SHORT_DAYS = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];

// Ordem de exibição da semana: segunda a domingo.
export const WEEK_ORDER = [1, 2, 3, 4, 5, 6, 0];

export const toMinutes = (hhmm) => {
  const [h, m] = hhmm.split(':').map(Number);
  return h * 60 + m;
};

export const fromMinutes = (total) => {
  const h = Math.floor(total / 60);
  const m = total % 60;
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
};

export const durationMin = (block) => toMinutes(block.end) - toMinutes(block.start);

// Só as tarefas são marcadas como feitas; compromissos e rotina são informativos.
export const isTrackable = (block) => block.type === 'tarefa';

export const minutesOfDay = (now) => now.getHours() * 60 + now.getMinutes();

export function dateKey(now) {
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, '0');
  const d = String(now.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

export function blocksForDay(week, day) {
  return week
    .filter((b) => b.day === day)
    .sort((a, b) => toMinutes(a.start) - toMinutes(b.start) || toMinutes(a.end) - toMinutes(b.end));
}

// Estado do dia em um instante: bloco atual, próximo, os que faltam e os que passaram.
export function dayState(week, now) {
  const day = now.getDay();
  const minute = minutesOfDay(now);
  const blocks = blocksForDay(week, day);

  const running = blocks.filter(
    (b) => toMinutes(b.start) <= minute && minute < toMinutes(b.end),
  );
  // Se algo se sobrepuser, vale o que começou por último.
  const current = running.length ? running[running.length - 1] : null;
  const upcoming = blocks.filter((b) => toMinutes(b.start) > minute);
  const past = blocks.filter((b) => toMinutes(b.end) <= minute);

  return { day, minute, blocks, current, next: upcoming[0] ?? null, upcoming, past };
}

export const minutesUntil = (block, now) => toMinutes(block.start) - minutesOfDay(now);
export const minutesLeft = (block, now) => toMinutes(block.end) - minutesOfDay(now);

// Progresso do dia = tarefas concluídas / total de tarefas.
export function progress(blocks, doneForDay = {}) {
  const tracked = blocks.filter(isTrackable);
  const done = tracked.filter((b) => doneForDay[b.id]).length;
  return { done, total: tracked.length, ratio: tracked.length ? done / tracked.length : 0 };
}

// Primeiro bloco do próximo dia que tenha algo agendado.
export function firstBlockOfNextDay(week, now) {
  for (let ahead = 1; ahead <= 7; ahead += 1) {
    const day = (now.getDay() + ahead) % 7;
    const blocks = blocksForDay(week, day);
    if (blocks.length) return { day, daysAhead: ahead, block: blocks[0] };
  }
  return null;
}

// Minutos de tarefas na semana, separando obrigatório de opcional.
export function weeklyTasks(week) {
  let required = 0;
  let optional = 0;
  for (const b of week) {
    if (!isTrackable(b)) continue;
    if (b.optional) optional += durationMin(b);
    else required += durationMin(b);
  }
  return { required, optional, total: required + optional };
}

export function formatDuration(minutes) {
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  if (h && m) return `${h}h${String(m).padStart(2, '0')}`;
  if (h) return `${h}h`;
  return `${m} min`;
}

// Distribui os blocos de um dia em "faixas" lado a lado quando eles se sobrepõem
// (usado pela grade da semana). Retorna [{ block, lane, lanes }].
export function layoutDay(blocks) {
  const sorted = [...blocks].sort(
    (a, b) => toMinutes(a.start) - toMinutes(b.start) || toMinutes(b.end) - toMinutes(a.end),
  );
  const result = [];
  let cluster = [];
  let clusterEnd = -1;

  const flush = () => {
    if (!cluster.length) return;
    const laneEnds = [];
    const placed = cluster.map((block) => {
      const start = toMinutes(block.start);
      let lane = laneEnds.findIndex((end) => end <= start);
      if (lane < 0) {
        lane = laneEnds.length;
        laneEnds.push(0);
      }
      laneEnds[lane] = toMinutes(block.end);
      return { block, lane };
    });
    for (const p of placed) result.push({ ...p, lanes: laneEnds.length });
    cluster = [];
  };

  for (const block of sorted) {
    const start = toMinutes(block.start);
    if (cluster.length && start >= clusterEnd) flush();
    cluster.push(block);
    clusterEnd = cluster.length === 1 ? toMinutes(block.end) : Math.max(clusterEnd, toMinutes(block.end));
  }
  flush();
  return result;
}
