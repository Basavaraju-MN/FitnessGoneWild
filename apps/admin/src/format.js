export const money = (value) =>
  `₹${Number(value || 0).toLocaleString('en-IN', { maximumFractionDigits: 2 })}`;

const parse = (value) => {
  if (!value) return null;
  // "YYYY-MM-DD" (dates) or "YYYY-MM-DD HH:MM:SS" (timestamps), local time
  const date = new Date(String(value).replace(' ', 'T'));
  return Number.isNaN(date.getTime()) ? null : date;
};

// Timestamps show date and time (IST, as sent by the server). Plain dates
// (travel dates) and dates entered without a time (stored as 00:00) show
// the date only.
export const date = (value) => {
  const d = parse(value);
  if (!d) return '—';
  const hasTime = /[ T]\d{2}:\d{2}/.test(String(value)) && !/[ T]00:00(:00)?$/.test(String(value));
  return d.toLocaleString('en-IN', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    ...(hasTime && { hour: 'numeric', minute: '2-digit' }),
  });
};

export const dateTime = date;

export const label = (value) =>
  String(value || '')
    .replace(/_/g, ' ')
    .replace(/\b\w/g, (c) => c.toUpperCase());

export const today = () => {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
};

const waDigits = (phone) => {
  let digits = String(phone || '').replace(/\D/g, '');
  if (digits.length === 10) digits = `91${digits}`;
  return digits;
};

export const whatsappLink = (phone, message = '') =>
  `https://wa.me/${waDigits(phone)}${message ? `?text=${encodeURIComponent(message)}` : ''}`;

// Straight into WhatsApp Web (no "open the app?" page)
export const whatsappWebLink = (phone, message = '') =>
  `https://web.whatsapp.com/send?phone=${waDigits(phone)}${message ? `&text=${encodeURIComponent(message)}` : ''}`;

// Straight into the installed WhatsApp app (desktop or phone)
export const whatsappAppLink = (phone, message = '') =>
  `whatsapp://send?phone=${waDigits(phone)}${message ? `&text=${encodeURIComponent(message)}` : ''}`;

// Downloads rows as a CSV that opens in Excel
export function exportCsv(filename, columns, rows) {
  const cell = (value) => `"${String(value ?? '').replace(/"/g, '""').replace(/\r?\n/g, ' ')}"`;
  const lines = [
    columns.map((c) => cell(c.label)).join(','),
    ...rows.map((row) =>
      columns.map((c) => cell(c.csv ? c.csv(row) : row[c.key])).join(',')
    ),
  ];

  const link = document.createElement('a');
  link.href = URL.createObjectURL(
    new Blob([`﻿${lines.join('\r\n')}`], { type: 'text/csv;charset=utf-8' })
  );
  link.download = filename;
  link.click();
  URL.revokeObjectURL(link.href);
}
