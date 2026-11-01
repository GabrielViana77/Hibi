// Controlador do Hibi: guarda o estado, escolhe a tela e liga as ações da interface.

import { h, icon } from './ui.js';
import { logoLockup } from './brand.js';
import { EXAMPLE_WEEK } from './examples.js';
import { sanitizeWeek } from './model.js';
import {
  dateKey,
  dayState,
  durationMin,
  minutesLeft,
  minutesOfDay,
  progress,
  toMinutes,
} from './schedule.js';
import {
  exportJson,
  loadDone,
  loadState,
  loadTimer,
  parseImport,
  pruneDone,
  saveDone,
  saveState,
  saveTimer,
  setDone,
} from './store.js';
import { buildIcs } from './ics.js';
import { createEditor } from './editor.js';
import { renderHero } from './views/hero.js';
import { renderToday } from './views/today.js';
import { renderWeek } from './views/week.js';
import { renderSettings } from './views/settings.js';

const ROUTES = ['inicio', 'hoje', 'semana', 'ajustes'];
const NAV = [
  { route: 'hoje', label: 'Hoje', icon: 'today' },
  { route: 'semana', label: 'Semana', icon: 'week' },
  { route: 'ajustes', label: 'Ajustes', icon: 'settings' },
];
const MAX_IMPORT_BYTES = 1_000_000;

// ---------- Relógio ----------
// Para testar: abra o app com ?now=2026-11-02T11:50 e o relógio parte dessa hora.
const params = new URLSearchParams(location.search);
const override = params.get('now') ? new Date(params.get('now')) : null;
const clockOffset = override && !Number.isNaN(override.getTime()) ? override.getTime() - Date.now() : 0;
const getNow = () => new Date(Date.now() + clockOffset);

// ---------- Estado ----------
const root = document.getElementById('root');
const desktopQuery = window.matchMedia('(min-width: 960px)');

let state = { welcomed: false, week: [] };
let done = {};
let timer = null;
let route = 'hoje';
let lastMinuteKey = '';

const ui = {
  pastOpen: false,
  selectedDay: getNow().getDay(),
  message: '',
};

const persist = () => saveState(state);
const dateNow = () => dateKey(getNow());

// ---------- Mensagens rápidas ----------
let toastTimer = 0;
function toast(text) {
  document.querySelector('.toast-live')?.remove();
  const el = h('div', { class: 'toast-live', role: 'status' }, text);
  document.body.append(el);
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => el.remove(), 3500);
}

// ---------- Ações ----------
const actions = {
  go(next) {
    route = ROUTES.includes(next) ? next : 'hoje';
    ui.message = '';
    if (route !== 'inicio' && !state.welcomed) {
      state.welcomed = true;
      persist();
    }
    history.replaceState(null, '', `${location.pathname}${location.search}#${route}`);
    render();
    window.scrollTo(0, 0);
  },

  selectDay(day) {
    ui.selectedDay = day;
    render();
  },

  openEditor(draft) {
    editor.open(draft);
  },

  saveBlocks({ replaceId, blocks }) {
    const week = replaceId ? state.week.filter((b) => b.id !== replaceId) : [...state.week];
    state.week = [...week, ...blocks];
    persist();
    ui.selectedDay = blocks[0].day;
    toast(replaceId ? 'Bloco atualizado.' : blocks.length > 1 ? `${blocks.length} blocos adicionados.` : 'Bloco adicionado.');
    render();
  },

  deleteBlock(id) {
    state.week = state.week.filter((b) => b.id !== id);
    if (timer?.blockId === id) {
      timer = null;
      saveTimer(null);
    }
    persist();
    toast('Bloco excluído.');
    render();
  },

  markDone(blockId, value) {
    done = setDone(done, dateNow(), blockId, value);
    saveDone(done);
    render();
  },

  startTimer(block, mode) {
    const now = getNow();
    let minutes;
    if (mode === 'five') minutes = 5;
    else if (minutesOfDay(now) < toMinutes(block.start)) minutes = durationMin(block);
    else minutes = Math.max(minutesLeft(block, now), 10);

    timer = { blockId: block.id, dateKey: dateKey(now), mode, phase: 'running', endsAt: Date.now() + minutes * 60000 };
    saveTimer(timer);
    render();
  },

  clearTimer() {
    timer = null;
    saveTimer(null);
    render();
  },

  finishTimer(blockId) {
    timer = null;
    saveTimer(null);
    actions.markDone(blockId, true);
  },

  startFromScratch() {
    state.welcomed = true;
    persist();
    route = 'semana';
    history.replaceState(null, '', `${location.pathname}${location.search}#semana`);
    render();
    window.scrollTo(0, 0);
    if (!state.week.length) editor.open({ day: 1 });
  },

  loadExample() {
    if (state.week.length && !window.confirm('Isso substitui a sua semana atual pela semana de exemplo. Continuar?')) return;
    state.week = sanitizeWeek(EXAMPLE_WEEK).week;
    state.welcomed = true;
    persist();
    timer = null;
    saveTimer(null);
    toast('Semana de exemplo carregada. Edite à vontade.');
    actions.go('hoje');
  },

  clearAll() {
    if (!window.confirm('Apagar toda a sua rotina e as marcações de “feito”? Isso não pode ser desfeito. (Dica: exporte um backup antes.)')) return;
    state.week = [];
    persist();
    done = {};
    saveDone(done);
    timer = null;
    saveTimer(null);
    toast('Rotina apagada.');
    render();
  },

  downloadIcs() {
    const now = getNow();
    download(buildIcs(state.week, { from: now, now }), 'hibi-rotina.ics', 'text/calendar;charset=utf-8');
    ui.message = 'Arquivo gerado. Abra-o e toque em “Adicionar todos”.';
    render();
  },

  exportJson() {
    download(exportJson(state.week), 'hibi-rotina.json', 'application/json;charset=utf-8');
    ui.message = 'Backup exportado. No outro aparelho, use “Importar rotina”.';
    render();
  },

  async importFile(file) {
    if (file.size > MAX_IMPORT_BYTES) {
      ui.message = 'Arquivo grande demais para ser uma rotina do Hibi.';
      render();
      return;
    }
    const result = parseImport(await file.text());
    if (!result.ok) {
      ui.message = result.error;
      render();
      return;
    }
    if (state.week.length && !window.confirm('Importar vai substituir a sua semana atual. Continuar?')) return;
    state.week = result.week;
    state.welcomed = true;
    persist();
    ui.message = `${result.week.length} blocos importados${result.skipped ? ` (${result.skipped} ignorados por estarem inválidos)` : ''}.`;
    render();
  },
};

function download(text, filename, type) {
  const url = URL.createObjectURL(new Blob([text], { type }));
  const link = h('a', { href: url, download: filename });
  document.body.append(link);
  link.click();
  link.remove();
  setTimeout(() => URL.revokeObjectURL(url), 10000);
}

const editor = createEditor({
  dialog: document.getElementById('editor'),
  getWeek: () => state.week,
  onSave: actions.saveBlocks,
  onDelete: actions.deleteBlock,
});

// ---------- Estrutura do app (barra lateral, abas, conteúdo) ----------
function sidebar(ctx) {
  const now = ctx.now;
  const today = dayState(state.week, now);
  const prog = progress(today.blocks, done[dateKey(now)] ?? {});

  return h(
    'aside',
    { class: 'sidebar' },
    h('button', { class: 'brand-btn', type: 'button', 'aria-label': 'Hibi: apresentação', onClick: () => actions.go('inicio') }, logoLockup({ size: 30 })),
    h(
      'nav',
      { class: 'nav', 'aria-label': 'Principal' },
      NAV.map((item) =>
        h(
          'button',
          {
            class: 'nav-item',
            type: 'button',
            'aria-current': route === item.route ? 'page' : null,
            onClick: () => actions.go(item.route),
          },
          icon(item.icon, 20),
          h('span', {}, item.label),
        ),
      ),
    ),
    h('span', { class: 'spacer' }),
    prog.total
      ? h(
          'div',
          { class: 'side-progress' },
          h('p', {}, h('strong', {}, `${prog.done} de ${prog.total}`), ' tarefas hoje'),
          h('div', { class: 'bar' }, h('span', { style: `width:${Math.round(prog.ratio * 100)}%` })),
        )
      : null,
    h('button', { class: 'side-link', type: 'button', onClick: () => actions.go('inicio') }, icon('info', 18), h('span', {}, 'Sobre o Hibi')),
  );
}

function shell(ctx, content) {
  return h(
    'div',
    { class: 'shell' },
    sidebar(ctx),
    h(
      'div',
      { class: 'main' },
      h(
        'header',
        { class: 'topbar' },
        h('button', { class: 'brand-btn', type: 'button', 'aria-label': 'Hibi: apresentação', onClick: () => actions.go('inicio') }, logoLockup({ size: 28 })),
      ),
      h('main', { class: 'view', id: 'view', tabindex: '-1' }, content),
    ),
    h(
      'nav',
      { class: 'tabs', 'aria-label': 'Principal' },
      NAV.map((item) =>
        h(
          'button',
          {
            class: 'tab',
            type: 'button',
            'aria-current': route === item.route ? 'page' : null,
            onClick: () => actions.go(item.route),
          },
          icon(item.icon, 22),
          h('span', {}, item.label),
        ),
      ),
    ),
  );
}

// ---------- Renderização ----------
function reconcileTimer() {
  if (!timer) return;
  const now = getNow();
  const block = state.week.find((b) => b.id === timer.blockId);
  if (!block || timer.dateKey !== dateKey(now) || block.day !== now.getDay()) {
    timer = null;
    saveTimer(null);
  }
}

function render() {
  reconcileTimer();
  const scroll = window.scrollY;
  const now = getNow();
  const ctx = {
    now,
    week: state.week,
    done,
    timer,
    ui,
    actions,
    desktop: desktopQuery.matches,
    hasRoutine: state.week.length > 0,
  };

  if (route === 'inicio') {
    root.replaceChildren(renderHero(ctx));
  } else {
    const views = { hoje: renderToday, semana: renderWeek, ajustes: renderSettings };
    root.replaceChildren(shell(ctx, views[route](ctx)));
  }
  document.documentElement.dataset.route = route;
  window.scrollTo(0, scroll);
}

function onTimerEnd() {
  navigator.vibrate?.(200);
  if (timer.mode === 'five') {
    timer = { ...timer, phase: 'five-done' };
    saveTimer(timer);
    render();
  } else {
    actions.finishTimer(timer.blockId);
  }
}

function tick() {
  if (timer?.phase === 'running') {
    const left = timer.endsAt - Date.now();
    if (left <= 0) {
      onTimerEnd();
      return;
    }
    const clock = document.getElementById('clock');
    if (clock) {
      const total = Math.max(0, Math.ceil(left / 1000));
      clock.textContent = `${String(Math.floor(total / 60)).padStart(2, '0')}:${String(total % 60).padStart(2, '0')}`;
    }
  }
  const now = getNow();
  const minuteKey = `${dateKey(now)} ${minutesOfDay(now)}`;
  if (minuteKey !== lastMinuteKey) {
    lastMinuteKey = minuteKey;
    // Não redesenha com a janela de edição aberta nem durante o texto digitado.
    if (!document.getElementById('editor').open) render();
  }
}

// ---------- Início ----------
async function boot() {
  const saved = loadState();
  if (saved) {
    state = saved;
  } else {
    // Primeira vez: se existir js/personal.js (arquivo local, fora do git), a semana já vem
    // preenchida com ele. Sem o arquivo, o app começa vazio, com a apresentação.
    try {
      const personal = await import('./personal.js');
      state = { welcomed: false, week: sanitizeWeek(personal.WEEK).week };
    } catch {
      state = { welcomed: false, week: [] };
    }
    persist();
  }

  done = pruneDone(loadDone(), getNow());
  timer = loadTimer();

  const fromHash = location.hash.slice(1);
  route = ROUTES.includes(fromHash) ? fromHash : state.welcomed ? 'hoje' : 'inicio';

  render();
  lastMinuteKey = `${dateNow()} ${minutesOfDay(getNow())}`;
  setInterval(tick, 1000);
}

desktopQuery.addEventListener('change', render);
window.addEventListener('hashchange', () => {
  const next = location.hash.slice(1);
  if (ROUTES.includes(next) && next !== route) actions.go(next);
});
document.addEventListener('visibilitychange', () => {
  if (!document.hidden) tick();
});

boot();

// O Hibi é um site comum por enquanto. Versões anteriores registravam um
// service worker que guardava arquivos antigos no navegador: aqui ele é
// removido, junto com os caches, para sempre carregar a versão atual.
if ('serviceWorker' in navigator) {
  navigator.serviceWorker
    .getRegistrations()
    .then(async (regs) => {
      if (!regs.length) return;
      await Promise.all(regs.map((r) => r.unregister()));
      if (window.caches) {
        const keys = await caches.keys();
        await Promise.all(keys.filter((k) => k.startsWith('hibi-')).map((k) => caches.delete(k)));
      }
      if (!sessionStorage.getItem('hibi:cleaned')) {
        sessionStorage.setItem('hibi:cleaned', '1');
        location.reload();
      }
    })
    .catch(() => {});
}
