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
import { SHORT_DAYS, WEEK_ORDER, blocksForDay } from '../schedule.js';
import { PHASE_LABEL, PRESETS, CYCLES_BEFORE_LONG, formatClock, isFresh, isRunning, leftMs } from '../pomodoro.js';
import { PHRASES, STUDY_TACTICS, dayStats, greeting, isStudy, pickByDay, suggestions } from '../suggest.js';
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


// ---------- Resumo do dia ----------

function statTile(label, value, sub) {
  return h(
    'div',
    { class: 'stat' },
    h('p', { class: 'stat-label' }, label),
    h('p', { class: 'stat-value' }, value),
    sub ? h('p', { class: 'stat-sub' }, sub) : null,
  );
}

function statsRow(ctx, blocks, doneToday) {
  const st = dayStats(blocks, doneToday, ctx.now);
  const focusMin = ctx.pomoToday * PRESETS[ctx.pomo.preset].focus;
  return h(
    'div',
    { class: 'stats' },
    statTile('Tarefas', st.tasksTotal ? `${st.tasksDone}/${st.tasksTotal}` : '—', st.tasksTotal ? 'feitas hoje' : 'nenhuma hoje'),
    statTile('Foco', ctx.pomoToday ? formatDuration(focusMin) : '0 min', ctx.pomoToday ? `${ctx.pomoToday} ${ctx.pomoToday === 1 ? 'pomodoro' : 'pomodoros'}` : 'nenhum ainda'),
    statTile('Livre', st.freeMinutes ? formatDuration(st.freeMinutes) : '—', st.freeMinutes ? 'até o fim da agenda' : 'sem folga'),
    statTile('Sequência', ctx.streak ? `${ctx.streak} ${ctx.streak === 1 ? 'dia' : 'dias'}` : '—', ctx.streak ? 'com tarefa feita' : 'comece hoje'),
  );
}

// ---------- Sugestões ----------

function suggestionsCard(ctx, doneToday) {
  const list = suggestions(ctx.week, doneToday, ctx.now);
  return h(
    'section',
    { class: 'panel tips' },
    h('p', { class: 'section-label' }, 'Sugestões agora'),
    h(
      'ul',
      { class: 'tip-list' },
      list.map((tip) =>
        h('li', { class: 'tip' }, h('span', { class: 'tip-dot', 'aria-hidden': 'true' }), h('div', {}, h('p', { class: 'tip-title' }, tip.title), h('p', { class: 'tip-text' }, tip.text))),
      ),
    ),
  );
}

// ---------- Pomodoro ----------

function pomodoroCard(ctx, studyBlock) {
  const { pomo, actions, now } = ctx;
  const running = isRunning(pomo);
  const fresh = isFresh(pomo);
  const clockMs = leftMs(pomo, Date.now());
  const inCycle = pomo.cycle % CYCLES_BEFORE_LONG;
  const dots = Array.from({ length: CYCLES_BEFORE_LONG }, (_, i) =>
    h('span', { class: `pomo-dot${i < inCycle || (pomo.phase === 'long' && pomo.cycle > 0) ? ' on' : ''}`, 'aria-hidden': 'true' }),
  );

  return h(
    'section',
    { class: `panel pomo phase-${pomo.phase}${running ? ' running' : ''}` },
    h(
      'div',
      { class: 'pomo-top' },
      h('div', {}, h('p', { class: 'section-label' }, 'Pomodoro'), h('p', { class: 'pomo-phase' }, `${PHASE_LABEL[pomo.phase]}${studyBlock && pomo.phase === 'focus' ? ` · ${studyBlock.title}` : ''}`)),
      h(
        'div',
        { class: 'seg', role: 'group', 'aria-label': 'Duração' },
        Object.entries(PRESETS).map(([key, p]) =>
          h('button', { class: 'seg-btn', type: 'button', 'aria-pressed': String(pomo.preset === key), onClick: () => actions.pomoPreset(key) }, p.label),
        ),
      ),
    ),
    h('p', { class: 'pomo-clock', id: 'pomo-clock', role: 'timer' }, formatClock(clockMs)),
    h('div', { class: 'pomo-dots', title: 'Ciclos até a pausa longa' }, dots, h('span', { class: 'pomo-count' }, ctx.pomoToday ? `${ctx.pomoToday} hoje` : '')),
    h(
      'div',
      { class: 'actions' },
      running
        ? h('button', { class: 'btn primary', type: 'button', onClick: actions.pomoPause }, 'Pausar')
        : h('button', { class: 'btn primary', type: 'button', onClick: actions.pomoStart }, fresh ? (pomo.phase === 'focus' ? 'Começar foco' : 'Começar pausa') : 'Continuar'),
      h('button', { class: 'btn', type: 'button', onClick: actions.pomoSkip }, pomo.phase === 'focus' ? 'Ir para a pausa' : 'Pular pausa'),
      !fresh || pomo.cycle ? h('button', { class: 'btn', type: 'button', onClick: actions.pomoReset }, 'Zerar') : null,
    ),
    h('p', { class: 'muted pomo-hint' }, pomo.phase === 'focus' ? 'Uma coisa só, celular longe. Quando o tempo acabar, pare e descanse.' : 'Levante, beba água, olhe para longe. A tela fica para depois.'),
  );
}

// ---------- Táticas de estudo ----------

function tacticsCard(ctx, { open }) {
  const first = pickByDay(STUDY_TACTICS, ctx.now);
  const rest = STUDY_TACTICS.filter((t) => t !== first);
  const item = (t) => h('li', { class: 'tactic' }, h('p', { class: 'tip-title' }, t.name), h('p', { class: 'tip-text' }, t.text));
  return h(
    'details',
    { class: 'panel tactics', open },
    h('summary', {}, h('span', { class: 'section-label' }, 'Táticas de estudo'), h('span', { class: 'tactics-hint' }, `Hoje: ${first.name}`)),
    h('ul', { class: 'tactic-list' }, item(first), rest.slice(0, 2).map(item)),
    h('details', { class: 'more-tactics' }, h('summary', {}, 'Ver mais táticas'), h('ul', { class: 'tactic-list' }, rest.slice(2).map(item))),
  );
}

// ---------- Semana em resumo ----------

function weekStrip(ctx) {
  const { now, week, done } = ctx;
  const monday = new Date(now.getFullYear(), now.getMonth(), now.getDate() - ((now.getDay() + 6) % 7));
  const days = WEEK_ORDER.map((day, i) => {
    const date = new Date(monday.getFullYear(), monday.getMonth(), monday.getDate() + i);
    const prog = progress(blocksForDay(week, day), done[dateKey(date)] ?? {});
    return { day, date, prog, isToday: day === now.getDay(), future: date > now && day !== now.getDay() };
  });
  return h(
    'section',
    { class: 'panel' },
    h('p', { class: 'section-label' }, 'Sua semana'),
    h(
      'ul',
      { class: 'strip' },
      days.map(({ day, prog, isToday, future }) =>
        h(
          'li',
          { class: `strip-day${isToday ? ' today' : ''}${future ? ' future' : ''}`, title: prog.total ? `${prog.done} de ${prog.total} tarefas` : 'sem tarefas' },
          h('span', { class: 'strip-bar', 'aria-hidden': 'true' }, h('span', { style: `height:${Math.round(prog.ratio * 100)}%` })),
          h('span', { class: 'strip-name' }, SHORT_DAYS[day]),
          h('span', { class: 'strip-num' }, prog.total ? `${prog.done}/${prog.total}` : '·'),
        ),
      ),
    ),
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
      h('div', { class: 'today-grid' }, h('div', { class: 'today-main' }, pomodoroCard(ctx, null), tacticsCard(ctx, { open: false })), h('div', { class: 'today-side' }, weekStrip(ctx))),
    ];
  }

  const prog = progress(state.blocks, doneToday);
  const timerBlock = timer ? state.blocks.find((b) => b.id === timer.blockId) : null;
  const card = timerBlock ? timerCard(timerBlock, ctx) : (nowCard(state, ctx, doneToday) ?? restCard(ctx));

  const focusBlock = state.current ?? state.next;
  const studyNow = isStudy(state.current) || (!state.current && isStudy(state.next) && minutesUntil(state.next, now) <= 60);
  const studyBlock = studyNow ? (state.current ?? state.next) : null;

  const pastIds = new Set(state.past.map((b) => b.id));
  const pastBlocks = state.blocks.filter((b) => pastIds.has(b.id));
  const upcomingBlocks = state.blocks.filter((b) => !pastIds.has(b.id));
  const row = (b) => blockRow(b, { state, doneToday, actions: ctx.actions });

  const left = h(
    'div',
    { class: 'today-main' },
    h('p', { class: 'greet' }, `${greeting(now)}. ${prog.total ? `Hoje: ${prog.total} ${prog.total === 1 ? 'tarefa' : 'tarefas'} e ${state.blocks.length - prog.total} ${state.blocks.length - prog.total === 1 ? 'compromisso' : 'compromissos'}.` : `${state.blocks.length} ${state.blocks.length === 1 ? 'bloco' : 'blocos'} hoje.`}`),
    statsRow(ctx, state.blocks, doneToday),
    prog.total
      ? h(
          'div',
          { class: 'progress' },
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
    suggestionsCard(ctx, doneToday),
    pomodoroCard(ctx, studyBlock ?? (isStudy(focusBlock) ? focusBlock : null)),
    tacticsCard(ctx, { open: !!studyBlock }),
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
    weekStrip(ctx),
    h('p', { class: 'phrase' }, pickByDay(PHRASES, now)),
  );

  return [head, h('div', { class: 'today-grid' }, left, right)];
}
