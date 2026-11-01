// Janela para criar, editar e excluir blocos. Usa <dialog>, que já cuida do foco e do Esc.

import { h, icon, DAY_LONG } from './ui.js';
import { SHORT_DAYS, WEEK_ORDER, fromMinutes, toMinutes } from './schedule.js';
import {
  REMIND_OPTIONS,
  TEMPLATES,
  TYPES,
  TYPE_ORDER,
  findOverlaps,
  MAX_NOTE,
  MAX_TITLE,
  newId,
  sanitizeBlock,
  validateDraft,
} from './model.js';

const addMinutes = (hhmm, minutes) => fromMinutes(Math.min(toMinutes(hhmm) + minutes, 23 * 60 + 59));

export function createEditor({ dialog, getWeek, onSave, onDelete }) {
  dialog.addEventListener('click', (event) => {
    if (event.target === dialog) dialog.close();
  });

  // `draft` vazio = novo bloco. Com `id` = editando aquele bloco.
  function open(draft = {}) {
    const editing = Boolean(draft.id);
    const start = draft.start ?? '09:00';
    const end = draft.end ?? addMinutes(start, 60);
    const startType = draft.type ?? 'tarefa';
    let confirmingDelete = false;

    const dayInputType = editing ? 'radio' : 'checkbox';
    const selectedDays = new Set([draft.day ?? new Date().getDay()]);

    // ----- campos -----
    const titleInput = h('input', {
      class: 'input',
      id: 'ed-title',
      name: 'title',
      type: 'text',
      maxlength: String(MAX_TITLE),
      autocomplete: 'off',
      placeholder: 'Ex.: Estudo, Academia, Aula',
      value: draft.title ?? '',
    });

    const typeChips = TYPE_ORDER.map((type) =>
      h(
        'label',
        { class: 'chip' },
        h('input', {
          class: 'sr-only',
          type: 'radio',
          name: 'type',
          value: type,
          checked: type === startType,
        }),
        h('span', { class: 'chip-face' }, TYPES[type].label),
      ),
    );

    const dayChips = WEEK_ORDER.map((day) =>
      h(
        'label',
        { class: 'chip chip-day' },
        h('input', {
          class: 'sr-only',
          type: dayInputType,
          name: 'day',
          value: String(day),
          checked: selectedDays.has(day),
          'aria-label': DAY_LONG[day],
        }),
        h('span', { class: 'chip-face' }, SHORT_DAYS[day]),
      ),
    );

    const startInput = h('input', { class: 'input', id: 'ed-start', name: 'start', type: 'time', step: '300', value: start });
    const endInput = h('input', { class: 'input', id: 'ed-end', name: 'end', type: 'time', step: '300', value: end });

    const noteInput = h('input', {
      class: 'input',
      id: 'ed-note',
      name: 'note',
      type: 'text',
      maxlength: String(MAX_NOTE),
      autocomplete: 'off',
      placeholder: 'Opcional. Ex.: Leve a roupa na mochila.',
      value: draft.note ?? '',
    });

    const remindSelect = h(
      'select',
      { class: 'input', id: 'ed-remind', name: 'remind' },
      REMIND_OPTIONS.map((option) =>
        h(
          'option',
          { value: option.value, selected: String(draft.remind ?? '') === option.value },
          option.label,
        ),
      ),
    );

    const optionalBox = h('input', {
      type: 'checkbox',
      name: 'optional',
      id: 'ed-optional',
      checked: draft.optional === true,
    });
    const optionalRow = h(
      'label',
      { class: 'check-row', for: 'ed-optional' },
      optionalBox,
      h('span', {}, 'Opcional: é o primeiro a cair quando a semana apertar'),
    );

    const typeHint = h('p', { class: 'hint', id: 'ed-type-hint' }, TYPES[startType].hint);
    const overlapHint = h('p', { class: 'hint warn', 'aria-live': 'polite' });
    const errorBox = h('p', { class: 'err', role: 'alert' });

    const templates = editing
      ? null
      : h(
          'div',
          { class: 'field' },
          h('span', { class: 'label' }, 'Atalhos'),
          h(
            'div',
            { class: 'templates' },
            TEMPLATES.map((tpl) =>
              h(
                'button',
                {
                  class: 'tpl',
                  type: 'button',
                  onClick: () => {
                    titleInput.value = tpl.title;
                    form.elements.type.value = tpl.type;
                    remindSelect.value = tpl.remind === undefined ? '' : String(tpl.remind);
                    endInput.value = addMinutes(startInput.value || '09:00', tpl.minutes);
                    sync();
                  },
                },
                tpl.label,
              ),
            ),
          ),
        );

    // ----- leitura do formulário -----
    function read() {
      const data = new FormData(form);
      const type = String(data.get('type') ?? 'tarefa');
      const remindRaw = String(data.get('remind') ?? '');
      return {
        title: String(data.get('title') ?? '').trim(),
        type,
        days: data.getAll('day').map(Number),
        start: String(data.get('start') ?? ''),
        end: String(data.get('end') ?? ''),
        note: String(data.get('note') ?? '').trim(),
        optional: type === 'tarefa' && data.get('optional') === 'on',
        remind: remindRaw === '' ? undefined : Number(remindRaw),
      };
    }

    function sync() {
      const value = read();
      typeHint.textContent = TYPES[value.type]?.hint ?? '';
      optionalRow.hidden = value.type !== 'tarefa';

      const clashes = value.days.flatMap((day) =>
        findOverlaps(getWeek(), { day, start: value.start, end: value.end, id: draft.id }),
      );
      const names = [...new Set(clashes.map((b) => b.title))];
      overlapHint.textContent = names.length
        ? `Esse horário se sobrepõe a: ${names.slice(0, 3).join(', ')}${names.length > 3 ? '…' : ''}. Você pode salvar mesmo assim.`
        : '';
    }

    // ----- rodapé -----
    const deleteButton = editing
      ? h(
          'button',
          {
            class: 'btn danger',
            type: 'button',
            onClick: () => {
              if (!confirmingDelete) {
                confirmingDelete = true;
                deleteButton.querySelector('.btn-label').textContent = 'Confirmar exclusão';
                return;
              }
              onDelete(draft.id);
              dialog.close();
            },
          },
          icon('trash', 18),
          h('span', { class: 'btn-label' }, 'Excluir'),
        )
      : null;

    const form = h(
      'form',
      { class: 'ed', novalidate: true },
      h(
        'div',
        { class: 'ed-body' },
        templates,
        h('div', { class: 'field' }, h('label', { class: 'label', for: 'ed-title' }, 'Nome'), titleInput),
        h(
          'fieldset',
          { class: 'field' },
          h('legend', { class: 'label' }, 'Tipo'),
          h('div', { class: 'chips' }, typeChips),
          typeHint,
        ),
        h(
          'fieldset',
          { class: 'field' },
          h('legend', { class: 'label' }, editing ? 'Dia' : 'Dias (escolha quantos quiser)'),
          h('div', { class: 'chips chips-days' }, dayChips),
        ),
        h(
          'div',
          { class: 'field-row' },
          h('div', { class: 'field' }, h('label', { class: 'label', for: 'ed-start' }, 'Início'), startInput),
          h('div', { class: 'field' }, h('label', { class: 'label', for: 'ed-end' }, 'Fim'), endInput),
        ),
        overlapHint,
        h('div', { class: 'field' }, h('label', { class: 'label', for: 'ed-remind' }, 'Lembrete no Calendário'), remindSelect),
        optionalRow,
        h('div', { class: 'field' }, h('label', { class: 'label', for: 'ed-note' }, 'Nota'), noteInput),
        errorBox,
      ),
      h(
        'div',
        { class: 'ed-foot' },
        deleteButton,
        h('span', { class: 'spacer' }),
        h('button', { class: 'btn', type: 'button', onClick: () => dialog.close() }, 'Cancelar'),
        h('button', { class: 'btn primary', type: 'submit' }, editing ? 'Salvar' : 'Adicionar'),
      ),
    );

    form.addEventListener('input', sync);
    form.addEventListener('change', sync);
    form.addEventListener('submit', (event) => {
      event.preventDefault();
      const value = read();
      const errors = validateDraft(value);
      if (errors.length) {
        errorBox.textContent = errors.join(' ');
        return;
      }
      const fields = {
        title: value.title,
        type: value.type,
        start: value.start,
        end: value.end,
        note: value.note || undefined,
        optional: value.optional || undefined,
        remind: value.remind,
      };
      const blocks = value.days
        .map((day) => sanitizeBlock({ ...fields, day, id: editing ? draft.id : newId() }))
        .filter(Boolean);
      if (!blocks.length) {
        errorBox.textContent = 'Não foi possível salvar esse bloco. Confira os campos.';
        return;
      }
      onSave({ replaceId: editing ? draft.id : null, blocks });
      dialog.close();
    });

    dialog.replaceChildren(
      h(
        'div',
        { class: 'ed-head' },
        h('h2', { class: 'ed-title' }, editing ? 'Editar bloco' : 'Novo bloco'),
        h('button', { class: 'icon-btn', type: 'button', 'aria-label': 'Fechar', onClick: () => dialog.close() }, icon('close', 20)),
      ),
      form,
    );

    sync();
    if (dialog.open) dialog.close();
    dialog.showModal();
    if (!editing) titleInput.focus();
  }

  return { open };
}
