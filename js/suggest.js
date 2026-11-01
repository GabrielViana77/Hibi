// Sugestões e dicas do dia (sem DOM): regras simples sobre a agenda, a hora e o que já foi feito.

import { isTrackable, minutesOfDay, toMinutes, formatDuration, dayState } from './schedule.js';

export const STUDY_RE = /estud|revis|prova|lista|leitura|ler\b|tcc|trabalho da faculdade/i;
export const isStudy = (block) => !!block && isTrackable(block) && STUDY_RE.test(block.title);

export const STUDY_TACTICS = [
  {
    name: 'Pomodoro',
    text: 'Foque 25 minutos, pare 5. A cada 4 ciclos, uma pausa longa. O relógio de começo curto vence a preguiça.',
  },
  {
    name: 'Recordação ativa',
    text: 'Feche o caderno e escreva tudo o que lembra do assunto. Só depois confira. Estudar tentando lembrar fixa mais do que reler.',
  },
  {
    name: 'Resolver antes de ver',
    text: 'Em exercícios (cálculo, por exemplo), tente a lista inteira antes de abrir a resolução. Errar tentando ensina mais.',
  },
  {
    name: 'Explique em voz alta',
    text: 'Explique o conceito como se ensinasse a um amigo, sem jargão. Onde você travar é onde falta entender.',
  },
  {
    name: 'Revisão espaçada',
    text: 'Revise o que estudou depois de 1 dia, 3 dias e 7 dias. Poucos minutos em cada vez valem mais que uma maratona.',
  },
  {
    name: 'Alterne os assuntos',
    text: 'Misture tipos de problema na mesma sessão em vez de repetir só um. Fica mais difícil, e por isso fixa melhor.',
  },
  {
    name: 'Celular longe',
    text: 'Deixe o celular em outro cômodo ou no modo avião durante o foco. Só a presença dele já tira atenção.',
  },
];

export const PHRASES = [
  'Comece pequeno. O resto vem junto.',
  'Você não precisa de vontade, só dos primeiros cinco minutos.',
  'Um bloco de cada vez já é um dia inteiro.',
  'Feito é melhor que perfeito.',
  'Constância ganha de intensidade.',
  'O que você faz hoje é o que o seu eu de amanhã herda.',
  'Descansar também faz parte do plano.',
  'Dia ruim com um bloco feito ainda é um dia bom.',
  'Disciplina é a rotina cuidando de você quando a motivação falta.',
  'Não precisa sentir vontade para começar. Comece, e a vontade aparece.',
];

// Escolha estável por dia (muda à meia-noite, não a cada abertura).
export function pickByDay(list, now) {
  const day = Math.floor(new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime() / 86400000);
  return list[day % list.length];
}

export function greeting(now) {
  const h = now.getHours();
  if (h < 5) return 'Boa madrugada';
  if (h < 12) return 'Bom dia';
  if (h < 18) return 'Boa tarde';
  return 'Boa noite';
}

// Estatísticas do dia: tarefas, tempo de tarefas feitas, tempo livre até o fim da agenda.
export function dayStats(blocks, doneToday, now) {
  const tasks = blocks.filter((b) => isTrackable(b) && !b.optional);
  const doneTasks = blocks.filter((b) => isTrackable(b) && doneToday[b.id]);
  const minutes = (list) => list.reduce((sum, b) => sum + (toMinutes(b.end) - toMinutes(b.start)), 0);
  const nowMin = minutesOfDay(now);
  const remaining = blocks.filter((b) => toMinutes(b.end) > nowMin);
  const lastEnd = remaining.length ? Math.max(...remaining.map((b) => toMinutes(b.end))) : nowMin;
  const busy = remaining.reduce((sum, b) => sum + (toMinutes(b.end) - Math.max(toMinutes(b.start), nowMin)), 0);
  return {
    tasksTotal: tasks.length,
    tasksDone: tasks.filter((b) => doneToday[b.id]).length,
    doneMinutes: minutes(doneTasks),
    freeMinutes: Math.max(0, lastEnd - nowMin - busy),
    lastEnd,
  };
}

// Dias seguidos (terminando hoje ou ontem) com pelo menos uma tarefa marcada como feita.
export function streak(done, now, keyOf) {
  let count = 0;
  const d = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const has = (date) => Object.values(done[keyOf(date)] ?? {}).some(Boolean);
  if (!has(d)) d.setDate(d.getDate() - 1); // hoje ainda pode virar
  while (has(d) && count < 400) {
    count++;
    d.setDate(d.getDate() - 1);
  }
  return count;
}

// Até 3 sugestões práticas para agora, em ordem de importância.
export function suggestions(week, doneToday, now) {
  const state = dayState(week, now);
  const nowMin = minutesOfDay(now);
  const out = [];
  const pendingTasks = state.blocks.filter((b) => isTrackable(b) && !b.optional && !doneToday[b.id]);
  const upcomingPending = pendingTasks.filter((b) => toMinutes(b.start) >= nowMin);
  const missed = pendingTasks.filter((b) => toMinutes(b.end) <= nowMin);

  if (state.current && isStudy(state.current) && !doneToday[state.current.id]) {
    out.push({ title: 'Hora de estudar', text: 'Comece um Pomodoro de 25 minutos. Celular longe e uma tarefa só.' });
  }

  if (state.next && !state.current) {
    const gap = toMinutes(state.next.start) - nowMin;
    const task = upcomingPending[0];
    if (gap >= 20 && task && task.id !== state.next.id) {
      out.push({ title: `${formatDuration(gap)} livres`, text: `Dá para adiantar algo antes de “${state.next.title}”. Que tal começar “${task.title}” com só 5 minutos?` });
    } else if (gap > 0 && gap <= 15) {
      out.push({ title: 'Quase na hora', text: `“${state.next.title}” começa em ${formatDuration(gap)}. Junte suas coisas e beba água.` });
    }
  }

  if (missed.length) {
    const b = missed[missed.length - 1];
    out.push({ title: 'Ficou para trás', text: `“${b.title}” passou do horário. Se ainda der, faça uma versão curta de 10 minutos: conta como feito.` });
  }

  const sleep = state.blocks.find((b) => b.type === 'rotina' && /desacel|dormir/i.test(b.title) && toMinutes(b.start) - nowMin <= 90 && toMinutes(b.end) > nowMin);
  if (sleep) {
    out.push({ title: 'Prepare o sono', text: 'Reduza luz e telas, deixe a roupa de amanhã separada e a mochila pronta.' });
  }

  if (now.getHours() < 11 && !state.current && state.blocks.length) {
    out.push({ title: 'Comece o dia leve', text: 'Água, luz do dia e olhar a agenda antes de abrir as redes.' });
  }

  if (!pendingTasks.length && state.blocks.some(isTrackable) && !missed.length) {
    out.push({ title: 'Tarefas em dia', text: 'Você fez o que tinha para hoje. Descanse sem culpa, ou adiante algo opcional.' });
  }

  if (!out.length) {
    out.push({ title: 'Sem vontade?', text: 'Escolha a tarefa mais fácil e faça só 5 minutos. Se quiser parar depois, pode.' });
  }
  return out.slice(0, 3);
}
