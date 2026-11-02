// Date periods for filters (Users & Roles → Sales performance): booking-date ranges.
// Each gives [from, to] as YYYY-MM-DD in local time, or [] for all time.
export const ymd = (d) =>
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;

export const PERIODS = {
  all: ['All time', () => []],
  this_month: ['This month', () => { const n = new Date(); return [ymd(new Date(n.getFullYear(), n.getMonth(), 1)), ymd(n)]; }],
  last_month: ['Last month', () => { const n = new Date(); return [ymd(new Date(n.getFullYear(), n.getMonth() - 1, 1)), ymd(new Date(n.getFullYear(), n.getMonth(), 0))]; }],
  this_year: ['This year', () => { const n = new Date(); return [ymd(new Date(n.getFullYear(), 0, 1)), ymd(n)]; }],
  custom: ['Custom dates…', null], // from / to chosen by the user
};

// [from, to] for a period; custom uses the dates typed in (either may be empty)
export const periodRange = (period, custom = {}) =>
  period === 'custom' ? [custom.from || '', custom.to || ''] : PERIODS[period][1]();
