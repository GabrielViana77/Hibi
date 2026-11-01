// A marca do Hibi: 日 (dia) com a barra âmbar, ao lado de 々 (repetição).
// A geometria é a mesma do ícone gerado em scripts/make-icons.py.

import { h } from './ui.js';

const MARK_PATHS = `
  <rect x="7" y="10" width="22" height="44" rx="7"/>
  <rect x="13" y="29.5" width="10" height="5" rx="2.5" fill="var(--amber)" stroke="none"/>
  <path d="M51 10L43.5 26"/>
  <path d="M41 26H55Q58.5 26 57.2 29.5L46 54"/>
  <path d="M47 38L42.5 47"/>`;

// Só a marca. Herda a cor do texto (currentColor); a barra é sempre âmbar.
export function logoMark(size = 28) {
  return h('span', {
    class: 'logo-mark',
    'aria-hidden': 'true',
    html: `<svg viewBox="0.5 0 64 64" width="${size}" height="${size}" fill="none" stroke="currentColor" stroke-width="3.6" stroke-linecap="round" stroke-linejoin="round">${MARK_PATHS}</svg>`,
  });
}

// Marca + nome, usada na barra lateral, no topo do celular e na apresentação.
export function logoLockup({ size = 28 } = {}) {
  return h('span', { class: 'logo' }, logoMark(size), h('span', { class: 'logo-word' }, 'hibi'));
}
