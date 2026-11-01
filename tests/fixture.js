// Semana pequena e fixa usada pelos testes (independe do exemplo e da rotina pessoal).

const b = (id, day, start, end, title, type, extra = {}) => ({ id, day, start, end, title, type, ...extra });

export const FIXTURE_WEEK = [
  // Segunda
  b('mon-wake', 1, '06:15', '06:30', 'Acordar', 'rotina', { remind: 0 }),
  b('mon-class', 1, '07:10', '10:50', 'Aulas', 'fixo'),
  b('mon-study-1', 1, '11:45', '12:45', 'Estudo', 'tarefa', { remind: 10 }),
  b('mon-course', 1, '13:30', '17:30', 'Curso', 'fixo'),
  b('mon-gym', 1, '18:15', '19:30', 'Academia', 'tarefa', { remind: 30, note: 'Leve a roupa, e a garrafa; ok?' }),
  b('mon-study-2', 1, '20:30', '21:30', 'Estudo', 'tarefa', { remind: 10 }),
  b('mon-sleep', 1, '22:30', '22:45', 'Dormir', 'rotina', { remind: 0 }),
  // Sexta
  b('fri-study', 5, '11:45', '12:25', 'Estudo', 'tarefa', { optional: true, remind: 0 }),
  b('fri-work', 5, '13:00', '17:00', 'Trabalho', 'fixo'),
  // Sábado
  b('sat-gym', 6, '09:30', '10:45', 'Academia', 'tarefa', { remind: 30 }),
  // Domingo
  b('sun-plan', 0, '20:30', '20:45', 'Planejar a semana', 'tarefa', { remind: 10 }),
];
