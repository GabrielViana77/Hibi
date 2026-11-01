// Exporta a semana como arquivo .ics (iCalendar) com eventos semanais recorrentes e alarmes.
//
// Por quê: um PWA no iPhone não consegue disparar notificações com o app fechado sem um
// servidor de push. O app Calendário do iOS dispara alarmes de forma confiável, então os
// lembretes viajam por ele.

import { toMinutes } from './schedule.js';

const BYDAY = ['SU', 'MO', 'TU', 'WE', 'TH', 'FR', 'SA'];
const TZID = 'America/Sao_Paulo';

const pad2 = (n) => String(n).padStart(2, '0');

export function escapeText(text) {
  return String(text)
    .replace(/\\/g, '\\\\')
    .replace(/;/g, '\\;')
    .replace(/,/g, '\\,')
    .replace(/\r?\n/g, '\\n');
}

// Dobra linhas longas (RFC 5545): no máximo 75 octetos por linha, sem cortar caracteres.
export function fold(line) {
  const encoder = new TextEncoder();
  const out = [];
  let current = '';
  let bytes = 0;
  let limit = 75;
  for (const char of line) {
    const size = encoder.encode(char).length;
    if (bytes + size > limit) {
      out.push(current);
      current = ' ';
      bytes = 1;
      limit = 75;
    }
    current += char;
    bytes += size;
  }
  out.push(current);
  return out.join('\r\n');
}

// Próxima data (a partir de `from`, inclusive) que cai no dia da semana pedido.
export function nextDateForDay(day, from) {
  const date = new Date(from.getFullYear(), from.getMonth(), from.getDate());
  date.setDate(date.getDate() + ((day - date.getDay() + 7) % 7));
  return date;
}

function localStamp(date, hhmm) {
  const minutes = toMinutes(hhmm);
  return (
    `${date.getFullYear()}${pad2(date.getMonth() + 1)}${pad2(date.getDate())}` +
    `T${pad2(Math.floor(minutes / 60))}${pad2(minutes % 60)}00`
  );
}

function utcStamp(date) {
  return date.toISOString().replace(/[-:]/g, '').replace(/\.\d{3}/, '');
}

export function buildIcs(week, { from = new Date(), now = new Date() } = {}) {
  const lines = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//Hibi//Rotina//PT',
    'CALSCALE:GREGORIAN',
    'METHOD:PUBLISH',
    'X-WR-CALNAME:Hibi',
    `X-WR-TIMEZONE:${TZID}`,
    'BEGIN:VTIMEZONE',
    `TZID:${TZID}`,
    'BEGIN:STANDARD',
    'DTSTART:19700101T000000',
    'TZOFFSETFROM:-0300',
    'TZOFFSETTO:-0300',
    'TZNAME:-03',
    'END:STANDARD',
    'END:VTIMEZONE',
  ];

  for (const block of week) {
    if (block.remind === undefined) continue;
    const date = nextDateForDay(block.day, from);
    const title = block.optional ? `${block.title} (opcional)` : block.title;
    const trigger = block.remind === 0 ? 'PT0S' : `-PT${block.remind}M`;

    lines.push(
      'BEGIN:VEVENT',
      `UID:${block.id}@hibi.app`,
      `DTSTAMP:${utcStamp(now)}`,
      `DTSTART;TZID=${TZID}:${localStamp(date, block.start)}`,
      `DTEND;TZID=${TZID}:${localStamp(date, block.end)}`,
      `RRULE:FREQ=WEEKLY;BYDAY=${BYDAY[block.day]}`,
      `SUMMARY:${escapeText(`Hibi · ${title}`)}`,
    );
    if (block.note) lines.push(`DESCRIPTION:${escapeText(block.note)}`);
    lines.push(
      'BEGIN:VALARM',
      'ACTION:DISPLAY',
      `DESCRIPTION:${escapeText(title)}`,
      `TRIGGER:${trigger}`,
      'END:VALARM',
      'END:VEVENT',
    );
  }

  lines.push('END:VCALENDAR');
  return `${lines.map(fold).join('\r\n')}\r\n`;
}
