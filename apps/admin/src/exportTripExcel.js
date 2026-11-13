import { date } from './format';

const BRAND = 'FF4681DB';
const HEAD_FILL = 'FFDAE5F8';
const thin = { style: 'thin', color: { argb: 'FFD0D0D0' } };
const border = { top: thin, left: thin, bottom: thin, right: thin };
const rupees = '"₹"#,##0.00';

const travelLabel = (r) => {
  // Price options booked, e.g. "2 × Chennai to Chennai"
  if (r.tickets?.length) return r.tickets.map((t) => `${t.people} × ${t.label}`).join(', ');
  if (r.travel_mode === 'mixed') return `${r.with_transport_people} with / ${r.without_transport_people} without`;
  if (r.travel_mode === 'without_transport') return 'Without transport';
  return 'With transport';
};

/**
 * Trip coordination sheet: trip name and dates on top, then one row per
 * customer (name, mobile, people, pickup, paid, balance) and totals.
 * Cancelled bookings are left out. ExcelJS loads only when exporting.
 */
export async function exportTripExcel(departure) {
  const { default: ExcelJS } = await import('exceljs');

  const customers = (departure.customers || []).filter((c) => c.status !== 'cancelled');
  const sum = (key) => customers.reduce((s, c) => s + Number(c[key] || 0), 0);
  const dates = departure.end_date && departure.end_date !== departure.start_date
    ? `${date(departure.start_date)} → ${date(departure.end_date)}`
    : date(departure.start_date);

  const book = new ExcelJS.Workbook();
  book.creator = 'The Fitness Gone Wild';
  const code = departure.trip_code || `Trip ${departure.id}`;
  const sheet = book.addWorksheet(code.replace(/[\\/?*[\]:]/g, '-').slice(0, 31), {
    pageSetup: { orientation: 'landscape', fitToPage: true, fitToWidth: 1, fitToHeight: 0 },
  });

  sheet.columns = [
    { key: 'no', width: 6 },
    { key: 'name', width: 26 },
    { key: 'phone', width: 15 },
    { key: 'people', width: 9 },
    { key: 'transport', width: 20 },
    { key: 'pickup', width: 28 },
    { key: 'total', width: 13 },
    { key: 'paid', width: 14 },
    { key: 'balance', width: 16 },
    { key: 'status', width: 12 },
    { key: 'booking', width: 17 },
  ];
  const lastCol = 'K';

  /* ---------- Trip details on top ---------- */
  sheet.mergeCells(`A1:${lastCol}1`);
  const title = sheet.getCell('A1');
  title.value = departure.trip_name;
  title.font = { bold: true, size: 16, color: { argb: 'FFFFFFFF' } };
  title.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: BRAND } };
  title.alignment = { vertical: 'middle' };
  sheet.getRow(1).height = 28;

  const details = [
    ['Departure date', dates],
    ['Trip code', departure.trip_code || 'Not given yet'],
    ['Guide', departure.guide_name ? `${departure.guide_name}${departure.guide_phone ? ` · ${departure.guide_phone}` : ''}` : 'Not assigned'],
    ['Customers', `${customers.length} bookings · ${sum('people')} people`],
  ];
  details.forEach(([label, value], i) => {
    const row = sheet.getRow(2 + i);
    row.getCell(1).value = label;
    row.getCell(1).font = { bold: true };
    sheet.mergeCells(`A${2 + i}:B${2 + i}`);
    row.getCell(3).value = value;
    sheet.mergeCells(`C${2 + i}:${lastCol}${2 + i}`);
  });

  /* ---------- Customer table ---------- */
  const headRow = sheet.getRow(details.length + 3);
  ['#', 'Customer name', 'Mobile number', 'People', 'Transport', 'Pickup point', 'Total (₹)', 'Advance paid (₹)', 'Remaining balance (₹)', 'Payment', 'Booking ID']
    .forEach((text, i) => {
      const cell = headRow.getCell(i + 1);
      cell.value = text;
      cell.font = { bold: true };
      cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: HEAD_FILL } };
      cell.border = border;
      cell.alignment = { vertical: 'middle', wrapText: true };
    });
  headRow.height = 30;
  const firstDataRow = headRow.number + 1;

  customers.forEach((c, i) => {
    const row = sheet.addRow({
      no: i + 1,
      name: c.customer_name,
      phone: c.customer_phone,
      people: Number(c.people),
      transport: travelLabel(c),
      pickup: c.pickup_name ? `${c.pickup_name}${c.pickup_address ? ` – ${c.pickup_address}` : ''}` : 'Self',
      total: Number(c.amount),
      paid: Number(c.amount_paid),
      balance: Number(c.balance_amount),
      status: Number(c.balance_amount) > 0 ? (Number(c.amount_paid) > 0 ? 'Advance' : 'Unpaid') : 'Paid',
      booking: c.booking_ref,
    });
    row.eachCell({ includeEmpty: true }, (cell) => { cell.border = border; });
    // Mobile as text so Excel keeps it as typed
    row.getCell('phone').numFmt = '@';
    ['total', 'paid', 'balance'].forEach((key) => { row.getCell(key).numFmt = rupees; });
    if (Number(c.balance_amount) > 0) row.getCell('balance').font = { bold: true, color: { argb: 'FFB3261E' } };
  });

  if (!customers.length) {
    sheet.addRow({ name: 'No customers on this trip yet.' });
  } else {
    // Totals (formulas, so they stay right if the sheet is edited)
    const last = firstDataRow + customers.length - 1;
    const total = sheet.addRow({
      name: 'Total',
      people: { formula: `SUM(D${firstDataRow}:D${last})`, result: sum('people') },
      total: { formula: `SUM(G${firstDataRow}:G${last})`, result: sum('amount') },
      paid: { formula: `SUM(H${firstDataRow}:H${last})`, result: sum('amount_paid') },
      balance: { formula: `SUM(I${firstDataRow}:I${last})`, result: sum('balance_amount') },
    });
    total.font = { bold: true };
    total.eachCell({ includeEmpty: true }, (cell) => {
      cell.border = border;
      cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFEFF4FC' } };
    });
    ['total', 'paid', 'balance'].forEach((key) => { total.getCell(key).numFmt = rupees; });
  }

  // Keep the trip details and column names visible while scrolling
  sheet.views = [{ state: 'frozen', ySplit: headRow.number }];

  await download(book, departure, code, '');
}

// Saves the workbook as e.g. TC-0012-Netravati-Peak-Trek-2026-10-16<suffix>.xlsx
async function download(book, departure, code, suffix) {
  const buffer = await book.xlsx.writeBuffer();
  const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
  const safeName = String(departure.trip_name || 'trip').replace(/[^a-z0-9]+/gi, '-').replace(/^-+|-+$/g, '').slice(0, 50);
  const link = document.createElement('a');
  link.href = URL.createObjectURL(blob);
  link.download = `${code.replace(/[^A-Za-z0-9_-]+/g, '-')}-${safeName}-${String(departure.start_date).slice(0, 10)}${suffix}.xlsx`;
  document.body.appendChild(link);
  link.click();
  link.remove();
  setTimeout(() => URL.revokeObjectURL(link.href), 1000);
}

/**
 * Trip accounts (office only): its own file, separate from the customer
 * list. Sheets: Summary (income, collections, expenses, profit / loss),
 * Collections (every payment received) and Expenses (every expense).
 * report = GET /departures/:id/report
 */
export async function exportTripAccounts(departure, report) {
  const { default: ExcelJS } = await import('exceljs');
  const book = new ExcelJS.Workbook();
  book.creator = 'The Fitness Gone Wild';
  const code = departure.trip_code || `Trip ${departure.id}`;
  const dates = departure.end_date && departure.end_date !== departure.start_date
    ? `${date(departure.start_date)} → ${date(departure.end_date)}`
    : date(departure.start_date);

  const trip = { departure, dates, code };
  fillSummary(newSheet(book, 'Summary'), trip, report);
  addCollections(newSheet(book, 'Collections'), trip, report.collections);
  addExpenses(newSheet(book, 'Expenses'), trip, report.expenses);
  await download(book, departure, code, '-accounts');
}

/* ---------- Trip accounts sheets ---------- */

const newSheet = (book, name) => book.addWorksheet(name, {
  pageSetup: { orientation: 'landscape', fitToPage: true, fitToWidth: 1, fitToHeight: 0 },
});

const guideLine = (departure) => departure.guide_names
  || (departure.guide_name ? `${departure.guide_name}${departure.guide_phone ? ` · ${departure.guide_phone}` : ''}` : 'Not assigned');

/**
 * Same top block as the customer export: the trip name on a blue bar, then
 * one row per trip detail (bold label, value), then an empty row.
 * labelCols: how many columns the label spans (2 like the customer sheet).
 * Returns the first free row (where the table header goes).
 */
function tripHeader(sheet, { departure, dates, code }, title, lastCol, lines, labelCols = 2) {
  sheet.mergeCells(`A1:${lastCol}1`);
  const cell = sheet.getCell('A1');
  cell.value = title ? `${departure.trip_name} · ${title}` : departure.trip_name;
  cell.font = { bold: true, size: 16, color: { argb: 'FFFFFFFF' } };
  cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: BRAND } };
  cell.alignment = { vertical: 'middle' };
  sheet.getRow(1).height = 28;

  const details = [
    ['Departure date', dates],
    ['Trip code', departure.trip_code || code],
    ['Trip ID', String(departure.id)],
    ['Guide', guideLine(departure)],
    ...lines,
  ];
  const labelEnd = sheet.getColumn(labelCols).letter;
  const valueStart = sheet.getColumn(labelCols + 1).letter;
  details.forEach(([label, value], i) => {
    const rowNo = 2 + i;
    const row = sheet.getRow(rowNo);
    row.getCell(1).value = label;
    row.getCell(1).font = { bold: true };
    if (labelCols > 1) sheet.mergeCells(`A${rowNo}:${labelEnd}${rowNo}`);
    row.getCell(labelCols + 1).value = value;
    if (valueStart !== lastCol) sheet.mergeCells(`${valueStart}${rowNo}:${lastCol}${rowNo}`);
  });
  return details.length + 3;
}

const inr = (value) => `₹${Number(value || 0).toLocaleString('en-IN', { maximumFractionDigits: 2 })}`;
const GREEN = 'FF1F7A4D';
const RED = 'FFB3261E';

// A table: header row, data rows, total row (formulas)
function table(sheet, startRow, columns, rows, totals = {}) {
  const head = sheet.getRow(startRow);
  columns.forEach((col, i) => {
    const cell = head.getCell(i + 1);
    cell.value = col.title;
    cell.font = { bold: true };
    cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: HEAD_FILL } };
    cell.border = border;
    cell.alignment = { vertical: 'middle', wrapText: true };
  });
  head.height = 30;
  columns.forEach((col, i) => { sheet.getColumn(i + 1).width = col.width; });

  rows.forEach((r, n) => {
    const row = sheet.getRow(startRow + 1 + n);
    columns.forEach((col, i) => {
      const cell = row.getCell(i + 1);
      cell.value = col.value(r, n);
      cell.border = border;
      if (col.money) cell.numFmt = rupees;
      if (col.text) cell.numFmt = '@';
      if (col.wrap) cell.alignment = { wrapText: true, vertical: 'top' };
    });
    if (rows[n].red) row.font = { color: { argb: RED } };
  });

  const first = startRow + 1;
  const last = startRow + rows.length;
  if (!rows.length) {
    sheet.getRow(first).getCell(2).value = 'Nothing yet.';
    return first;
  }
  const total = sheet.getRow(last + 1);
  total.getCell(2).value = 'Total';
  columns.forEach((col, i) => {
    if (!col.sum) return;
    const letter = sheet.getColumn(i + 1).letter;
    const cell = total.getCell(i + 1);
    cell.value = { formula: `SUM(${letter}${first}:${letter}${last})`, result: totals[col.sum] ?? 0 };
    cell.numFmt = rupees;
  });
  total.font = { bold: true };
  columns.forEach((_, i) => {
    const cell = total.getCell(i + 1);
    cell.border = border;
    cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFEFF4FC' } };
  });
  sheet.views = [{ state: 'frozen', ySplit: startRow }];
  return last + 1;
}

const METHOD = { cash: 'Cash', upi: 'UPI', bank_transfer: 'Bank transfer', card: 'Card', phonepe: 'PhonePe', other: 'Other' };
const methodName = (m) => METHOD[m] || m || '';
const STATUS = { submitted: 'Waiting for approval', approved: 'Approved', rejected: 'Rejected (not counted)' };

function addCollections(sheet, trip, rows) {
  const sum = rows.reduce((s, r) => s + Number(r.amount), 0);
  const refunds = rows.filter((r) => Number(r.amount) < 0);
  const start = tripHeader(sheet, trip, 'Collections', 'L', [
    ['Payments', `${rows.length - refunds.length} received${refunds.length ? ` · ${refunds.length} refund${refunds.length === 1 ? "" : "s"}` : ''} · total ${inr(sum)}`],
  ]);
  table(sheet, start, [
    { title: '#', width: 5, value: (r, n) => n + 1 },
    { title: 'Date', width: 20, value: (r) => date(r.at) },
    { title: 'Booking ID', width: 17, value: (r) => r.booking_ref },
    { title: 'Customer', width: 24, value: (r) => r.customer_name },
    { title: 'Mobile', width: 14, text: true, value: (r) => r.customer_phone },
    { title: 'Type', width: 26, value: (r) => r.kind },
    { title: 'Method', width: 13, value: (r) => methodName(r.method) },
    { title: 'Amount (₹)', width: 14, money: true, sum: 'amount', value: (r) => Number(r.amount) },
    { title: 'Received / done by', width: 20, value: (r) => r.received_by || (r.method === 'phonepe' ? 'Website' : '') },
    { title: 'Reference', width: 30, value: (r) => r.reference || '' },
    { title: 'Note', width: 34, wrap: true, value: (r) => r.note || '' },
    { title: 'Booking status', width: 14, value: (r) => r.booking_status },
  ], rows.map((r) => ({ ...r, red: Number(r.amount) < 0 })), { amount: sum });
}

function addExpenses(sheet, trip, rows) {
  const counted = rows.filter((r) => r.status !== 'rejected');
  const sum = counted.reduce((s, r) => s + Number(r.amount), 0);
  const waiting = rows.filter((r) => r.status === 'submitted').length;
  const start = tripHeader(sheet, trip, 'Expenses', 'J', [
    ['Expenses', `${counted.length} counted · total ${inr(sum)}${waiting ? ` · ${waiting} waiting for approval` : ''}`],
  ]);
  // Rejected ones are listed (greyed) but their amount is not added up
  table(sheet, start, [
    { title: '#', width: 5, value: (r, n) => n + 1 },
    { title: 'Date', width: 14, value: (r) => date(r.spent_on) },
    { title: 'What for', width: 22, value: (r) => r.category },
    { title: 'Details', width: 40, wrap: true, value: (r) => r.description || '' },
    { title: 'Paid by', width: 11, value: (r) => methodName(r.paid_by) },
    { title: 'Amount (₹)', width: 14, money: true, sum: 'amount', value: (r) => (r.status === 'rejected' ? 0 : Number(r.amount)) },
    { title: 'Added by', width: 20, value: (r) => r.created_by_name || '' },
    { title: 'Status', width: 22, value: (r) => STATUS[r.status] || r.status },
    { title: 'Office note', width: 28, wrap: true, value: (r) => (r.status === 'rejected' ? `Rejected ₹${Number(r.amount)}${r.review_note ? `: ${r.review_note}` : ''}` : r.review_note || '') },
    { title: 'Bill photo', width: 11, value: (r) => (Number(r.has_receipt) ? 'Yes' : 'No') },
  ], rows.map((r) => ({ ...r, red: false })), { amount: sum });
  rows.forEach((r, n) => {
    if (r.status === 'rejected') sheet.getRow(start + 1 + n).font = { color: { argb: 'FF9AA0A6' }, italic: true };
  });

  // Expenses by category, under the list
  const byCategory = {};
  counted.forEach((r) => { byCategory[r.category] = (byCategory[r.category] || 0) + Number(r.amount); });
  let at = start + rows.length + 3;
  sheet.getRow(at).getCell(3).value = 'By category';
  sheet.getRow(at).font = { bold: true };
  Object.entries(byCategory).sort((a, b) => b[1] - a[1]).forEach(([category, amount]) => {
    at += 1;
    const row = sheet.getRow(at);
    row.getCell(3).value = category;
    row.getCell(6).value = amount;
    row.getCell(6).numFmt = rupees;
  });
}

function fillSummary(sheet, trip, report) {
  const f = report.finance;
  sheet.columns = [{ width: 34 }, { width: 22 }, { width: 46 }];
  const start = tripHeader(sheet, trip, 'Trip accounts', 'C', [
    ['Customers', `${f.bookings} bookings · ${f.people} people`],
  ], 1);

  const lines = [
    ['MONEY IN', null, null, 'head'],
    ['Booking amounts', f.booked, 'Confirmed / completed bookings, after refunds'],
    ['Kept from cancelled bookings', f.kept, 'Paid minus refunds'],
    ['B2B with other vendors', f.b2bNet || 0, 'Inbound: what vendors owe us · outbound: advance kept + settlement'],
    ['B2B still to settle', f.b2bToSettle || 0, '+ vendors owe us · − we owe vendors'],
    ['Trip income', f.income, 'Booking amounts + kept from cancellations + B2B', 'bold'],
    ['Collected so far', f.collected, 'Every payment: see the Collections sheet'],
    ['Still to collect', f.pending, 'Balances customers still owe'],
    null,
    ['MONEY OUT', null, null, 'head'],
    ['Expenses approved', f.expensesApproved, ''],
    ['Expenses waiting for approval', f.expensesWaiting, 'Guide expenses not reviewed yet'],
    ['Total expenses', f.expenses, 'See the Expenses sheet (rejected ones not counted)', 'bold'],
    null,
    ['RESULT', null, null, 'head'],
    [f.profit < 0 ? 'LOSS on this trip' : 'PROFIT on this trip', f.profit, 'Trip income − total expenses', 'result'],
    [f.cashProfit < 0 ? 'Loss with money received so far' : 'Profit with money received so far', f.cashProfit, 'Collected so far − total expenses', 'cash'],
  ];

  let rowNo = start - 1;
  for (const line of lines) {
    rowNo += 1;
    if (!line) continue;
    const [name, value, note, style] = line;
    const row = sheet.getRow(rowNo);
    row.getCell(1).value = name;
    if (style === 'head') {
      [1, 2, 3].forEach((c) => {
        const cell = row.getCell(c);
        cell.font = { bold: true };
        cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: HEAD_FILL } };
        cell.border = border;
      });
      continue;
    }
    if (typeof value === 'number') {
      row.getCell(2).value = value;
      row.getCell(2).numFmt = rupees;
    } else {
      row.getCell(2).value = value;
    }
    if (note) row.getCell(3).value = note;
    row.getCell(3).font = { color: { argb: 'FF80868B' } };
    if (style === 'bold') row.getCell(1).font = row.getCell(2).font = { bold: true };
    if (style === 'result' || style === 'cash') {
      const colour = value < 0 ? RED : GREEN;
      row.getCell(1).font = { bold: true, size: style === 'result' ? 13 : 11, color: { argb: colour } };
      row.getCell(2).font = { bold: true, size: style === 'result' ? 13 : 11, color: { argb: colour } };
      if (style === 'result') row.height = 22;
    }
  }
  sheet.getRow(rowNo + 2).getCell(1).value = `Made on ${new Date().toLocaleString('en-IN')}`;
  sheet.getRow(rowNo + 2).getCell(1).font = { italic: true, color: { argb: 'FF80868B' } };
}
