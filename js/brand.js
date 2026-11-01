// A marca do Hibi: 日 (dia) com a barra âmbar, ao lado de 々 (repetição).
// A geometria é a mesma do ícone gerado em scripts/make-icons.py.

import { h } from './ui.js';

const MARK_PATHS = `
  <rect x="7" y="10" width="22" height="44" rx="7"/>
  <rect x="13" y="29.5" width="10" height="5" rx="2.5" fill="var(--amber)" stroke="none"/>
  <path d="M49 9Q47 19 39 27"/>
  <path d="M42 23H54Q60.5 23 59.5 31Q57.5 46 41 54.5"/>
  <circle cx="50" cy="41" r="2.4" fill="var(--amber)" stroke="none"/>`;

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
