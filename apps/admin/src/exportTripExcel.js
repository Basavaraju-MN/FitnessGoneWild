import { date } from './format';

const BRAND = 'FF4681DB';
const HEAD_FILL = 'FFDAE5F8';
const thin = { style: 'thin', color: { argb: 'FFD0D0D0' } };
const border = { top: thin, left: thin, bottom: thin, right: thin };
const rupees = '"₹"#,##0.00';

const travelLabel = (r) => {
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

  const buffer = await book.xlsx.writeBuffer();
  const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
  const safeName = String(departure.trip_name || 'trip').replace(/[^a-z0-9]+/gi, '-').replace(/^-+|-+$/g, '').slice(0, 50);
  const link = document.createElement('a');
  link.href = URL.createObjectURL(blob);
  link.download = `${code.replace(/[^A-Za-z0-9_-]+/g, '-')}-${safeName}-${String(departure.start_date).slice(0, 10)}.xlsx`;
  document.body.appendChild(link);
  link.click();
  link.remove();
  setTimeout(() => URL.revokeObjectURL(link.href), 1000);
}
