// Tela de apresentação: o que é o Hibi e o que ele faz.

import { h, icon } from '../ui.js';
import { logoLockup, logoMark } from '../brand.js';

const FEATURES = [
  {
    icon: 'layers',
    title: 'Monte sua semana',
    text: 'Cadastre aulas, trabalho, estudo, treino e rotina de sono. Repita um bloco em vários dias de uma vez.',
  },
  {
    icon: 'target',
    title: 'Saiba o que fazer agora',
    text: 'A tela Hoje mostra o bloco atual, quanto falta para ele acabar e o que vem depois.',
  },
  {
    icon: 'spark',
    title: 'Comece sem peso',
    text: 'Sem vontade? O botão “Só 5 minutos” faz você começar. Depois você decide se continua.',
  },
  {
    icon: 'bell',
    title: 'Lembretes de verdade',
    text: 'Exporte para o app Calendário e receba alarmes semanais no celular, na hora certa.',
  },
  {
    icon: 'device',
    title: 'Celular e computador',
    text: 'Instale como app no iPhone, no Android ou no PC. Funciona offline e se adapta à tela.',
  },
  {
    icon: 'shield',
    title: 'Seus dados são seus',
    text: 'Sem conta, sem servidor, sem rastreamento. Tudo fica no seu aparelho, e você exporta quando quiser.',
  },
];

const STEPS = [
  ['1', 'Monte a semana', 'Adicione seus compromissos fixos e o que você quer encaixar.'],
  ['2', 'Abra o Hoje', 'Veja o bloco do momento e comece com um toque.'],
  ['3', 'Marque o que fez', 'Acompanhe o progresso do dia e ajuste a semana quando precisar.'],
];

// Ilustração do app (decorativa): um pedaço da tela Hoje.
function preview() {
  const item = (time, title, extra = '') =>
    h(
      'li',
      { class: `pv-item${extra ? ` ${extra}` : ''}` },
      h('span', { class: 'pv-time' }, time),
      h('span', {}, title),
      extra === 'done' ? h('span', { class: 'pv-check' }, icon('check', 12)) : null,
    );

  return h(
    'div',
    { class: 'preview', 'aria-hidden': 'true' },
    h(
      'div',
      { class: 'pv-card' },
      h('p', { class: 'pv-eyebrow' }, 'Agora · 11:45–12:45'),
      h('p', { class: 'pv-title' }, 'Estudo'),
      h('p', { class: 'pv-meta' }, 'Termina em 55 min'),
      h(
        'div',
        { class: 'pv-actions' },
        h('span', { class: 'pv-btn primary' }, 'Começar'),
        h('span', { class: 'pv-btn' }, 'Só 5 minutos'),
      ),
    ),
    h(
      'ul',
      { class: 'pv-list' },
      item('07:10', 'Aulas', 'past'),
      item('11:45', 'Estudo', 'current'),
      item('18:15', 'Academia'),
      item('22:30', 'Dormir'),
    ),
  );
}

export function renderHero(ctx) {
  const { hasRoutine, actions } = ctx;

  const primary = primaryButton(hasRoutine, actions);

  const secondary = hasRoutine
    ? h('button', { class: 'btn lg', type: 'button', onClick: () => actions.go('semana') }, 'Ver minha semana')
    : h('button', { class: 'btn lg', type: 'button', onClick: actions.loadExample }, 'Ver um exemplo');

  return h(
    'div',
    { class: 'hero-page' },
    h(
      'header',
      { class: 'hero-top' },
      h('span', { class: 'hero-logo' }, logoLockup({ size: 30 })),
      hasRoutine
        ? h('button', { class: 'btn ghost', type: 'button', onClick: () => actions.go('hoje') }, 'Entrar no app')
        : null,
    ),

    h(
      'section',
      { class: 'hero' },
      h(
        'div',
        { class: 'hero-copy' },
        h('p', { class: 'hero-kicker' }, h('span', { lang: 'ja' }, '日々'), ' · dia após dia'),
        h('h1', { class: 'hero-title' }, 'Seu dia, bloco por bloco.'),
        h(
          'p',
          { class: 'hero-sub' },
          'O Hibi organiza a sua semana em blocos de tempo, mostra o que fazer agora e ajuda você a começar quando a vontade não vem.',
        ),
        h('div', { class: 'hero-cta' }, primary, secondary),
        h('p', { class: 'hero-note' }, 'Grátis, funciona offline e guarda tudo no seu aparelho.'),
      ),
      preview(),
    ),

    h(
      'section',
      { class: 'hero-section', 'aria-labelledby': 'how' },
      h('h2', { class: 'hero-h2', id: 'how' }, 'Como funciona'),
      h(
        'ol',
        { class: 'steps' },
        STEPS.map(([n, title, text]) =>
          h('li', { class: 'step' }, h('span', { class: 'step-n' }, n), h('h3', {}, title), h('p', {}, text)),
        ),
      ),
    ),

    h(
      'section',
      { class: 'hero-section', 'aria-labelledby': 'what' },
      h('h2', { class: 'hero-h2', id: 'what' }, 'O que ele faz'),
      h(
        'ul',
        { class: 'features' },
        FEATURES.map((f) =>
          h(
            'li',
            { class: 'feature' },
            h('span', { class: 'feature-icon' }, icon(f.icon, 22)),
            h('h3', {}, f.title),
            h('p', {}, f.text),
          ),
        ),
      ),
    ),

    h(
      'section',
      { class: 'hero-end' },
      logoMark(44),
      h('h2', { class: 'hero-h2' }, 'Comece pela sua semana.'),
      h('div', { class: 'hero-cta' }, primaryButton(hasRoutine, actions)),
    ),

    h(
      'footer',
      { class: 'hero-foot' },
      h('span', {}, 'Hibi · 日々, “dia após dia”'),
      h('span', {}, 'Código aberto (MIT)'),
    ),
  );
}

// O botão principal aparece duas vezes (topo e final), então é criado por esta função.
function primaryButton(hasRoutine, actions) {
  return h(
    'button',
    {
      class: 'btn primary lg',
      type: 'button',
      onClick: hasRoutine ? () => actions.go('hoje') : actions.startFromScratch,
    },
    h('span', { class: 'btn-label' }, hasRoutine ? 'Abrir meu dia' : 'Criar minha rotina'),
    icon('arrow', 18),
  );
}
