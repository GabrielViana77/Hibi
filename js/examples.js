// Semana de exemplo, para quem quer ver o Hibi funcionando antes de montar a própria.
// Também serve de modelo: troque os horários pelos seus.

const mk = (days, start, end, title, type, extra = {}) =>
  days.map((day) => ({
    id: `ex-${day}-${start.replace(':', '')}-${type}`,
    day,
    start,
    end,
    title,
    type,
    ...extra,
  }));

const WEEKDAYS = [1, 2, 3, 4, 5];

export const EXAMPLE_WEEK = [
  ...mk(WEEKDAYS, '06:45', '07:00', 'Acordar', 'rotina', { remind: 0 }),
  ...mk(WEEKDAYS, '09:00', '12:00', 'Aulas', 'fixo'),
  ...mk(WEEKDAYS, '12:00', '13:00', 'Almoço', 'fixo'),
  ...mk([1, 2, 3, 4], '14:00', '15:30', 'Estudo', 'tarefa', { remind: 10 }),
  ...mk([5], '14:00', '15:30', 'Estudo', 'tarefa', { remind: 10, optional: true }),
  ...mk([1, 3, 5], '18:30', '19:30', 'Academia', 'tarefa', {
    remind: 30,
    note: 'Leve a roupa na mochila.',
  }),
  ...mk([0, 1, 2, 3, 4], '22:00', '22:30', 'Desacelerar', 'rotina', {
    remind: 0,
    note: 'Telas longe, luz baixa.',
  }),
  ...mk([0, 1, 2, 3, 4], '22:30', '22:45', 'Dormir', 'rotina', { remind: 0 }),
  ...mk([6], '09:00', '10:00', 'Academia', 'tarefa', { remind: 30 }),
  ...mk([6], '11:00', '12:00', 'Estudo', 'tarefa', {
    remind: 10,
    optional: true,
    note: 'Revisão da semana.',
  }),
  ...mk([0], '20:00', '20:15', 'Planejar a semana', 'tarefa', { remind: 10 }),
];
