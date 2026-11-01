import { h, icon } from '../ui.js';

export function newBlockButton(ctx, { day, label = 'Novo bloco' } = {}) {
  return h(
    'button',
    {
      class: 'btn primary',
      type: 'button',
      'aria-label': label,
      onClick: () => ctx.actions.openEditor({ day: day ?? ctx.now.getDay() }),
    },
    icon('plus', 18),
    h('span', { class: 'btn-label' }, label),
  );
}

// Mostrada quando a pessoa ainda não cadastrou nada.
export function emptyWeekCard(ctx) {
  return h(
    'section',
    { class: 'panel empty' },
    h('h2', { class: 'panel-title' }, 'Sua semana está vazia'),
    h(
      'p',
      { class: 'muted' },
      'Comece pelos compromissos fixos (aulas, trabalho) e depois encaixe o que você quer fazer: estudo, treino, descanso. Dá para repetir um bloco em vários dias de uma vez.',
    ),
    h(
      'div',
      { class: 'actions' },
      h(
        'button',
        { class: 'btn primary', type: 'button', onClick: () => ctx.actions.openEditor({ day: 1 }) },
        icon('plus', 18),
        h('span', { class: 'btn-label' }, 'Adicionar primeiro bloco'),
      ),
      h('button', { class: 'btn', type: 'button', onClick: ctx.actions.loadExample }, 'Carregar um exemplo'),
    ),
  );
}
