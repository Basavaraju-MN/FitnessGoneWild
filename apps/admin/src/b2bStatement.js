import { date } from './format';

/*
 * A B2B vendor statement, to send to the vendor:
 *   - the customers they gave us and the customers we gave them (open ones)
 *   - per customer: B2B price, what the customer paid, what is owed
 *   - the net: what they send us, or what we send them
 * statement = GET /b2b/vendors/:id/statement
 */

const inr = (value) => `₹${Number(value || 0).toLocaleString('en-IN', { maximumFractionDigits: 2 })}`;

// One line for the net, from our side
export function netLine(statement) {
  const { vendor, totals } = statement;
  if (Math.abs(totals.net) < 0.01) return 'Nothing to settle';
  return totals.net > 0 ? `${vendor.name} sends us ${inr(totals.net)}` : `We send ${vendor.name} ${inr(-totals.net)}`;
}

// WhatsApp / copy text, written to the vendor
export function statementText(statement) {
  const { vendor, open, totals } = statement;
  const inbound = open.filter((r) => r.direction === 'inbound');
  const outbound = open.filter((r) => r.direction === 'outbound');
  const line = (r) => {
    const owed = r.remaining > 0 ? `you send us ${inr(r.remaining)}` : `we send you ${inr(-r.remaining)}`;
    return `• ${date(r.transfer_date)} · ${r.trip_name}${r.trip_code ? ` (${r.trip_code})` : ''} · ${r.customer_name} · ${r.people} ${Number(r.people) === 1 ? 'person' : 'people'} · B2B ${inr(r.b2b_total)} · customer paid ${r.direction === 'inbound' ? 'us' : 'you'} ${inr(r.customer_amount)} → ${owed}`;
  };
  const parts = [
    `Hi ${vendor.contact_person || vendor.name},`,
    `B2B statement from The Fitness Gone Wild (${date(new Date().toISOString().slice(0, 10))}):`,
  ];
  if (inbound.length) parts.push('', `Customers you gave us (${totals.receivedPeople} ${totals.receivedPeople === 1 ? 'person' : 'people'}):`, ...inbound.map(line));
  if (outbound.length) parts.push('', `Customers we gave you (${totals.sentPeople} ${totals.sentPeople === 1 ? 'person' : 'people'}):`, ...outbound.map(line));
  parts.push('');
  if (totals.net > 0.009) parts.push(`Total: please send us ${inr(totals.net)}.`);
  else if (totals.net < -0.009) parts.push(`Total: we will send you ${inr(-totals.net)}.`);
  else parts.push('Total: nothing to settle, we are even.');
  parts.push('', '— The Fitness Gone Wild');
  return parts.join('\n');
}

const BRAND = 'FF4681DB';
const HEAD_FILL = 'FFDAE5F8';
const thin = { style: 'thin', color: { argb: 'FFD0D0D0' } };
const border = { top: thin, left: thin, bottom: thin, right: thin };
const rupees = '"₹"#,##0.00';

// Excel file of the statement (same look as the trip exports)
export async function exportStatementExcel(statement) {
  const { default: ExcelJS } = await import('exceljs');
  const { vendor, open, totals } = statement;
  const book = new ExcelJS.Workbook();
  book.creator = 'The Fitness Gone Wild';
  const sheet = book.addWorksheet('Statement', { pageSetup: { orientation: 'landscape', fitToPage: true, fitToWidth: 1, fitToHeight: 0 } });
  sheet.columns = [{ width: 5 }, { width: 13 }, { width: 30 }, { width: 24 }, { width: 9 }, { width: 14 }, { width: 16 }, { width: 18 }, { width: 18 }];

  sheet.mergeCells('A1:I1');
  const title = sheet.getCell('A1');
  title.value = `B2B statement · ${vendor.name}`;
  title.font = { bold: true, size: 16, color: { argb: 'FFFFFFFF' } };
  title.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: BRAND } };
  title.alignment = { vertical: 'middle' };
  sheet.getRow(1).height = 28;

  const details = [
    ['From', 'The Fitness Gone Wild'],
    ['To', [vendor.name, vendor.company, vendor.contact_person, vendor.phone].filter(Boolean).join(' · ')],
    ['Date', date(new Date().toISOString().slice(0, 10))],
    ['Customers', `They gave us ${totals.receivedPeople} · we gave them ${totals.sentPeople} (open)`],
  ];
  details.forEach(([name, value], i) => {
    const row = sheet.getRow(2 + i);
    row.getCell(1).value = name;
    row.getCell(1).font = { bold: true };
    sheet.mergeCells(`A${2 + i}:B${2 + i}`);
    row.getCell(3).value = value;
    sheet.mergeCells(`C${2 + i}:I${2 + i}`);
  });

  let at = details.length + 3;
  const section = (heading, rows, paidLabel) => {
    sheet.mergeCells(`A${at}:I${at}`);
    const h = sheet.getCell(`A${at}`);
    h.value = heading;
    h.font = { bold: true, size: 12 };
    at += 1;
    const head = sheet.getRow(at);
    ['#', 'Date', 'Trip', 'Customer', 'People', 'B2B total (₹)', paidLabel, 'They send us (₹)', 'We send them (₹)'].forEach((text, i) => {
      const cell = head.getCell(i + 1);
      cell.value = text;
      cell.font = { bold: true };
      cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: HEAD_FILL } };
      cell.border = border;
      cell.alignment = { wrapText: true, vertical: 'middle' };
    });
    head.height = 30;
    at += 1;
    if (!rows.length) {
      sheet.getRow(at).getCell(3).value = 'None';
      at += 2;
      return;
    }
    rows.forEach((r, n) => {
      const row = sheet.getRow(at);
      const values = [n + 1, date(r.transfer_date), `${r.trip_name}${r.trip_code ? ` (${r.trip_code})` : ''} · ${date(r.start_date)}`,
        `${r.customer_name} · ${r.customer_phone || ''}`, Number(r.people), Number(r.b2b_total), Number(r.customer_amount),
        r.remaining > 0 ? r.remaining : 0, r.remaining < 0 ? -r.remaining : 0];
      values.forEach((v, i) => {
        const cell = row.getCell(i + 1);
        cell.value = v;
        cell.border = border;
        if (i >= 5) cell.numFmt = rupees;
      });
      at += 1;
    });
    at += 1;
  };
  section('Customers they gave us (inbound)', open.filter((r) => r.direction === 'inbound'), 'Customer paid us (₹)');
  section('Customers we gave them (outbound)', open.filter((r) => r.direction === 'outbound'), 'Customer paid them (₹)');

  const totalRow = (name, value, colour) => {
    const row = sheet.getRow(at);
    sheet.mergeCells(`A${at}:G${at}`);
    row.getCell(1).value = name;
    row.getCell(1).font = { bold: true, color: colour ? { argb: colour } : undefined };
    sheet.mergeCells(`H${at}:I${at}`);
    row.getCell(8).value = value;
    row.getCell(8).numFmt = rupees;
    row.getCell(8).font = { bold: true, color: colour ? { argb: colour } : undefined };
    at += 1;
  };
  totalRow('They send us (total)', totals.toReceive);
  totalRow('We send them (total)', totals.toPay);
  totalRow(totals.net >= 0 ? `NET: ${vendor.name} sends us` : `NET: we send ${vendor.name}`, Math.abs(totals.net), totals.net >= 0 ? 'FF1F7A4D' : 'FFB3261E');

  const buffer = await book.xlsx.writeBuffer();
  const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
  const link = document.createElement('a');
  link.href = URL.createObjectURL(blob);
  link.download = `B2B-statement-${String(vendor.name).replace(/[^A-Za-z0-9]+/g, '-')}-${new Date().toISOString().slice(0, 10)}.xlsx`;
  document.body.appendChild(link);
  link.click();
  link.remove();
  setTimeout(() => URL.revokeObjectURL(link.href), 1000);
}
