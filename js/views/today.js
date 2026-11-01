import { h, icon, longDate, fmtClock, pageHead, range } from '../ui.js';
import {
  dateKey,
  dayState,
  durationMin,
  firstBlockOfNextDay,
  formatDuration,
  isTrackable,
  minutesLeft,
  minutesUntil,
  progress,
} from '../schedule.js';
import { DAY_LONG } from '../ui.js';
import { emptyWeekCard, newBlockButton } from './shared.js';

function blockRow(block, { state, doneToday, actions }) {
  const isCurrent = state.current?.id === block.id;
  const isPast = state.past.some((b) => b.id === block.id);
  const checked = !!doneToday[block.id];
  const sub = [block.optional ? 'opcional' : null, block.note].filter(Boolean).join(' · ');

  return h(
    'li',
    { class: `item${isPast ? ' past' : ''}${isCurrent ? ' current' : ''}` },
    h('span', { class: `dot t-${block.type}`, 'aria-hidden': 'true' }),
    h('span', { class: 'item-time' }, range(block)),
    h(
      'div',
      { class: 'item-body' },
      h('p', { class: 'item-title' }, block.title),
      sub ? h('p', { class: 'item-sub' }, sub) : null,
    ),
    isTrackable(block)
      ? h(
          'button',
          {
            class: 'check',
            type: 'button',
            'aria-pressed': String(checked),
            'aria-label': `${block.title}, ${range(block)}: marcar como feito`,
            onClick: () => actions.markDone(block.id, !checked),
          },
          h('span', {}, icon('check', 14)),
        )
      : h('span', { class: 'check-spacer' }),
  );
}

function timerCard(block, ctx) {
  const { timer, actions } = ctx;

  if (timer.phase !== 'running') {
    return h(
      'section',
      { class: 'panel now' },
      h(
        'div',
        {},
        h('p', { class: 'now-label' }, 'Cinco minutos feitos'),
        h('h2', { class: 'now-title' }, 'Você começou.'),
        h('p', { class: 'now-meta' }, `${block.title}. Agora decida: continua ou para por aqui?`),
      ),
      h(
        'div',
        { class: 'actions' },
        h('button', { class: 'btn primary', type: 'button', onClick: () => actions.startTimer(block, 'full') }, 'Continuar'),
        h('button', { class: 'btn', type: 'button', onClick: () => actions.finishTimer(block.id) }, 'Marcar como feito'),
        h('button', { class: 'btn', type: 'button', onClick: actions.clearTimer }, 'Parar por aqui'),
      ),
    );
  }

  return h(
    'section',
    { class: 'panel now' },
    h(
      'div',
      {},
      h('p', { class: 'now-label' }, timer.mode === 'five' ? 'Só 5 minutos' : 'Em foco'),
      h('h2', { class: 'now-title' }, block.title),
    ),
    h(
      'div',
      { class: 'timer' },
      h('p', { class: 'timer-clock', id: 'clock', role: 'timer' }, fmtClock(timer.endsAt - Date.now())),
      h(
        'p',
        { class: 'timer-hint' },
        timer.mode === 'five' ? 'Só comece. Depois você decide se continua.' : 'Um bloco de cada vez.',
      ),
      h(
        'div',
        { class: 'actions' },
        h('button', { class: 'btn primary', type: 'button', onClick: () => actions.finishTimer(block.id) }, 'Concluir'),
        h('button', { class: 'btn', type: 'button', onClick: actions.clearTimer }, 'Cancelar'),
      ),
    ),
  );
}

function nowCard(state, ctx, doneToday) {
  const { now, actions } = ctx;
  const block = state.current ?? state.next;
  if (!block) return null;

  const isCurrent = state.current?.id === block.id;
  const trackable = isTrackable(block);
  const checked = !!doneToday[block.id];

  const label = isCurrent
    ? `Agora · ${range(block)}`
    : `Em ${formatDuration(minutesUntil(block, now))} · ${range(block)}`;
  const meta = isCurrent
    ? `Termina em ${formatDuration(minutesLeft(block, now))}`
    : `${formatDuration(durationMin(block))}${block.optional ? ' · opcional' : ''}`;

  return h(
    'section',
    { class: 'panel now' },
    h(
      'div',
      {},
      h('p', { class: 'now-label' }, label),
      h('h2', { class: 'now-title' }, block.title),
      h('p', { class: 'now-meta' }, checked ? `${meta} · feito` : meta),
      block.note ? h('p', { class: 'now-note' }, block.note) : null,
    ),
    trackable && !checked
      ? h(
          'div',
          { class: 'actions' },
          h('button', { class: 'btn primary', type: 'button', onClick: () => actions.startTimer(block, 'full') }, 'Começar'),
          h('button', { class: 'btn', type: 'button', onClick: () => actions.startTimer(block, 'five') }, 'Só 5 minutos'),
        )
      : null,
  );
}

function restCard(ctx) {
  const next = firstBlockOfNextDay(ctx.week, ctx.now);
  const when = !next ? '' : next.daysAhead === 1 ? 'Amanhã' : DAY_LONG[next.day];
  return h(
    'section',
    { class: 'panel rest' },
    h('p', { class: 'now-label' }, 'Dia concluído'),
    h('h2', { class: 'now-title' }, 'Por hoje é isso.'),
    next ? h('p', { class: 'now-meta' }, `${when} começa com “${next.block.title}” às ${next.block.start}.`) : null,
  );
}

export function renderToday(ctx) {
  const { now, week, done, timer, ui } = ctx;
  const head = pageHead({ eyebrow: longDate(now), title: 'Hoje', actions: [newBlockButton(ctx)] });

  if (!week.length) return [head, emptyWeekCard(ctx)];

  const state = dayState(week, now);
  const doneToday = done[dateKey(now)] ?? {};

  if (!state.blocks.length) {
    return [
      head,
      h(
        'section',
        { class: 'panel empty' },
        h('h2', { class: 'panel-title' }, 'Nada agendado para hoje'),
        h('p', { class: 'muted' }, 'Aproveite o dia livre, ou adicione algo que você queira fazer.'),
        h('div', { class: 'actions' }, newBlockButton(ctx, { label: 'Adicionar bloco' })),
      ),
    ];
  }

  const prog = progress(state.blocks, doneToday);
  const timerBlock = timer ? state.blocks.find((b) => b.id === timer.blockId) : null;
  const card = timerBlock ? timerCard(timerBlock, ctx) : (nowCard(state, ctx, doneToday) ?? restCard(ctx));

  const pastIds = new Set(state.past.map((b) => b.id));
  const pastBlocks = state.blocks.filter((b) => pastIds.has(b.id));
  const upcomingBlocks = state.blocks.filter((b) => !pastIds.has(b.id));
  const row = (b) => blockRow(b, { state, doneToday, actions: ctx.actions });

  const left = h(
    'div',
    { class: 'today-main' },
    prog.total
      ? h(
          'div',
          { class: 'progress' },
          h(
            'div',
            { class: 'progress-row' },
            h('span', {}, `${prog.done} de ${prog.total} ${prog.total === 1 ? 'tarefa' : 'tarefas'}`),
            h('span', { class: 'muted' }, `${Math.round(prog.ratio * 100)}%`),
          ),
          h(
            'div',
            {
              class: 'bar',
              role: 'progressbar',
              'aria-label': 'Tarefas de hoje',
              'aria-valuemin': '0',
              'aria-valuemax': String(prog.total),
              'aria-valuenow': String(prog.done),
            },
            h('span', { style: `width:${Math.round(prog.ratio * 100)}%` }),
          ),
        )
      : null,
    card,
  );

  const right = h(
    'div',
    { class: 'today-side' },
    h('p', { class: 'section-label' }, 'O dia'),
    pastBlocks.length
      ? h(
          'details',
          {
            class: 'past-details',
            open: ui.pastOpen,
            onToggle: (event) => {
              ui.pastOpen = event.target.open;
            },
          },
          h('summary', {}, `Já passou (${pastBlocks.length})`),
          h('ul', { class: 'list' }, pastBlocks.map(row)),
        )
      : null,
    upcomingBlocks.length ? h('ul', { class: 'list' }, upcomingBlocks.map(row)) : null,
  );

  return [head, h('div', { class: 'today-grid' }, left, right)];
}
