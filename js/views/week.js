import { h, icon, pageHead, range } from '../ui.js';
import {
  SHORT_DAYS,
  WEEK_ORDER,
  blocksForDay,
  formatDuration,
  fromMinutes,
  layoutDay,
  minutesOfDay,
  toMinutes,
  weeklyTasks,
} from '../schedule.js';
import { TYPES, TYPE_ORDER } from '../model.js';
import { DAY_LONG } from '../ui.js';
import { emptyWeekCard, newBlockButton } from './shared.js';

const HOUR_PX = 56;

function summary(week) {
  const tasks = weeklyTasks(week);
  return h(
    'div',
    { class: 'week-summary' },
    h(
      'p',
      { class: 'muted' },
      'Tarefas na semana: ',
      h('strong', {}, formatDuration(tasks.required)),
      tasks.optional ? ` + ${formatDuration(tasks.optional)} opcionais` : '',
      '. Toque num bloco para editar.',
    ),
    h(
      'ul',
      { class: 'legend', 'aria-label': 'Legenda' },
      TYPE_ORDER.map((type) =>
        h('li', {}, h('span', { class: `dot t-${type}`, 'aria-hidden': 'true' }), TYPES[type].label),
      ),
    ),
  );
}

// ---------- Grade (computador) ----------

function weekGrid(ctx) {
  const { week, now, actions } = ctx;

  let firstHour = 7;
  let lastHour = 21;
  for (const b of week) {
    firstHour = Math.min(firstHour, Math.floor(toMinutes(b.start) / 60));
    lastHour = Math.max(lastHour, Math.ceil(toMinutes(b.end) / 60));
  }
  const hours = lastHour - firstHour;
  const height = hours * HOUR_PX;
  const topOf = (minutes) => ((minutes - firstHour * 60) * HOUR_PX) / 60;

  const gutter = h(
    'div',
    { class: 'wk-gutter', style: `height:${height}px`, 'aria-hidden': 'true' },
    Array.from({ length: hours }, (_, i) =>
      h('span', { style: `top:${i * HOUR_PX}px` }, `${String(firstHour + i).padStart(2, '0')}:00`),
    ),
  );

  const heads = WEEK_ORDER.map((day) =>
    h(
      'div',
      { class: `wk-dayhead${day === now.getDay() ? ' today' : ''}` },
      h('span', {}, SHORT_DAYS[day]),
      day === now.getDay() ? h('span', { class: 'wk-today-tag' }, 'hoje') : null,
    ),
  );

  const columns = WEEK_ORDER.map((day) => {
    const column = h('div', {
      class: `wk-col${day === now.getDay() ? ' today' : ''}`,
      style: `height:${height}px;--hour:${HOUR_PX}px`,
      role: 'group',
      'aria-label': DAY_LONG[day],
    });

    column.addEventListener('click', (event) => {
      if (event.target !== column) return;
      const y = event.clientY - column.getBoundingClientRect().top;
      const minutes = firstHour * 60 + Math.floor(((y / HOUR_PX) * 60) / 30) * 30;
      const start = fromMinutes(Math.min(minutes, 23 * 60));
      const end = fromMinutes(Math.min(minutes + 60, 23 * 60 + 59));
      actions.openEditor({ day, start, end });
    });

    for (const { block, lane, lanes } of layoutDay(blocksForDay(week, day))) {
      const top = topOf(toMinutes(block.start));
      const blockHeight = Math.max(((toMinutes(block.end) - toMinutes(block.start)) * HOUR_PX) / 60, 22);
      column.append(
        h(
          'button',
          {
            class: `wk-block t-${block.type}${block.optional ? ' optional' : ''}${blockHeight < 30 ? ' short' : ''}`,
            type: 'button',
            style: `top:${top}px;height:${blockHeight - 2}px;left:calc(${(lane / lanes) * 100}% + 2px);width:calc(${100 / lanes}% - 4px)`,
            title: `${block.title}, ${range(block)}`,
            'aria-label': `${block.title}, ${range(block)}. Editar.`,
            onClick: () => actions.openEditor(block),
          },
          h('span', { class: 'wk-block-title' }, block.title),
          blockHeight >= 40 ? h('span', { class: 'wk-block-time' }, range(block)) : null,
        ),
      );
    }

    if (day === now.getDay()) {
      const minute = minutesOfDay(now);
      if (minute >= firstHour * 60 && minute <= lastHour * 60) {
        column.append(h('div', { class: 'wk-now', style: `top:${topOf(minute)}px`, 'aria-hidden': 'true' }));
      }
    }
    return column;
  });

  return h(
    'div',
    { class: 'wk-wrap' },
    h(
      'div',
      { class: 'wk' },
      h('div', { class: 'wk-corner' }),
      heads,
      gutter,
      columns,
    ),
  );
}

// ---------- Lista por dia (celular) ----------

function dayList(ctx) {
  const { week, now, ui, actions } = ctx;
  const selected = ui.selectedDay;
  const blocks = blocksForDay(week, selected);

  const tabs = h(
    'div',
    { class: 'daytabs', role: 'group', 'aria-label': 'Dia da semana' },
    WEEK_ORDER.map((day) =>
      h(
        'button',
        {
          class: `daytab${day === now.getDay() ? ' is-today' : ''}`,
          type: 'button',
          'aria-pressed': String(day === selected),
          'aria-label': DAY_LONG[day],
          onClick: () => actions.selectDay(day),
        },
        SHORT_DAYS[day],
      ),
    ),
  );

  return h(
    'div',
    {},
    tabs,
    h('h2', { class: 'day-title' }, DAY_LONG[selected]),
    blocks.length
      ? h(
          'ul',
          { class: 'list' },
          blocks.map((block) =>
            h(
              'li',
              { class: 'item item-edit' },
              h(
                'button',
                {
                  class: 'item-btn',
                  type: 'button',
                  'aria-label': `${block.title}, ${range(block)}. Editar.`,
                  onClick: () => actions.openEditor(block),
                },
                h('span', { class: `dot t-${block.type}`, 'aria-hidden': 'true' }),
                h('span', { class: 'item-time' }, range(block)),
                h(
                  'span',
                  { class: 'item-body' },
                  h('span', { class: 'item-title' }, block.title),
                  block.optional || block.note
                    ? h('span', { class: 'item-sub' }, [block.optional ? 'opcional' : null, block.note].filter(Boolean).join(' · '))
                    : null,
                ),
                icon('edit', 18),
              ),
            ),
          ),
        )
      : h('p', { class: 'muted empty-day' }, 'Nada agendado nesse dia.'),
    h('div', { class: 'actions day-add' }, newBlockButton(ctx, { day: selected, label: `Adicionar a ${DAY_LONG[selected].toLowerCase()}` })),
  );
}

export function renderWeek(ctx) {
  const { week, desktop } = ctx;
  const head = pageHead({
    eyebrow: 'Segunda a domingo',
    title: 'Semana',
    actions: [newBlockButton(ctx, { day: ctx.ui.selectedDay })],
  });
  if (!week.length) return [head, emptyWeekCard(ctx)];
  return [head, summary(week), desktop ? weekGrid(ctx) : dayList(ctx)];
}
