import { h, icon, pageHead } from '../ui.js';

function card({ iconName, title, children }) {
  return h(
    'section',
    { class: 'panel set-card' },
    h('div', { class: 'set-head' }, h('span', { class: 'set-icon' }, icon(iconName, 20)), h('h2', { class: 'panel-title' }, title)),
    children,
  );
}

export function renderSettings(ctx) {
  const { week, ui, actions } = ctx;
  const reminderCount = week.filter((b) => b.remind !== undefined).length;

  const fileInput = h('input', {
    class: 'sr-only',
    type: 'file',
    id: 'import-file',
    accept: 'application/json,.json',
    onChange: (event) => {
      const file = event.target.files?.[0];
      event.target.value = '';
      if (file) actions.importFile(file);
    },
  });

  return [
    pageHead({ eyebrow: 'Seu app', title: 'Ajustes' }),
    h(
      'div',
      { class: 'set-grid' },

      card({
        iconName: 'bell',
        title: 'Lembretes no Calendário',
        children: [
          h(
            'p',
            { class: 'muted' },
            'Um app instalado da tela de início não consegue tocar alarme com o aplicativo fechado. O Calendário do celular consegue, então os avisos do Hibi passam por ele.',
          ),
          h(
            'p',
            { class: 'muted' },
            reminderCount
              ? `Sua semana tem ${reminderCount} ${reminderCount === 1 ? 'bloco com lembrete' : 'blocos com lembrete'}. Gere o arquivo e abra no celular: toque em “Adicionar todos”.`
              : 'Nenhum bloco tem lembrete ainda. Ao criar ou editar um bloco, escolha a antecedência do lembrete.',
          ),
          h(
            'div',
            { class: 'actions' },
            h(
              'button',
              { class: 'btn primary', type: 'button', disabled: reminderCount ? null : true, onClick: actions.downloadIcs },
              icon('download', 18),
              h('span', { class: 'btn-label' }, 'Baixar lembretes (.ics)'),
            ),
          ),
        ],
      }),

      card({
        iconName: 'layers',
        title: 'Backup e outros aparelhos',
        children: [
          h(
            'p',
            { class: 'muted' },
            'Sua rotina fica salva só neste aparelho. Para levá-la ao celular (ou guardar uma cópia), exporte aqui e importe no outro aparelho.',
          ),
          h(
            'div',
            { class: 'actions' },
            h(
              'button',
              { class: 'btn', type: 'button', disabled: week.length ? null : true, onClick: actions.exportJson },
              icon('download', 18),
              h('span', { class: 'btn-label' }, 'Exportar rotina'),
            ),
            h(
              'label',
              { class: 'btn', for: 'import-file', tabindex: '0', onKeydown: (e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); e.currentTarget.click(); } } },
              icon('upload', 18),
              h('span', { class: 'btn-label' }, 'Importar rotina'),
            ),
            fileInput,
          ),
          ui.hasPersonal
            ? h(
                'div',
                { class: 'actions' },
                h('button', { class: 'btn', type: 'button', onClick: actions.loadPersonal }, 'Carregar minha rotina pessoal'),
              )
            : null,
          ui.message ? h('p', { class: 'toast', role: 'status' }, ui.message) : null,
        ],
      }),

      card({
        iconName: 'device',
        title: 'Usar no celular e no computador',
        children: [
          h(
            'ul',
            { class: 'steps-list' },
            h('li', {}, h('strong', {}, 'Mesmo endereço: '), 'abra o site do Hibi em qualquer navegador, no celular ou no computador.'),
            h('li', {}, h('strong', {}, 'Levar a rotina: '), 'exporte aqui no aparelho de origem e importe no outro.'),
            h('li', {}, h('strong', {}, 'Atalho: '), 'no celular, salve o site nos favoritos ou na tela inicial pelo menu do navegador.'),
          ),
          h('p', { class: 'muted' }, 'Cada aparelho guarda a própria cópia. Use o backup para mantê-las iguais.'),
        ],
      }),

      card({
        iconName: 'shield',
        title: 'Seus dados',
        children: [
          h(
            'p',
            { class: 'muted' },
            'O Hibi não tem conta nem servidor. Tudo o que você cadastra fica neste navegador. Limpar os dados do site apaga a rotina, então vale exportar um backup de vez em quando.',
          ),
          h(
            'div',
            { class: 'actions' },
            h('button', { class: 'btn', type: 'button', onClick: actions.loadExample }, 'Carregar semana de exemplo'),
            h('button', { class: 'btn danger', type: 'button', disabled: week.length ? null : true, onClick: actions.clearAll }, 'Apagar minha rotina'),
          ),
        ],
      }),
    ),
  ];
}
