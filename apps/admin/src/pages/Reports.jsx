import { useState } from 'react';

import { api } from '../api';
import { useAdmin } from '../context';
import { date, dateTime, exportCsv, label } from '../format';
import { PageHead, useToast } from '../components/ui';

// Each report: which module it needs, where the data comes from, CSV columns
const REPORTS = [
  {
    id: 'bookings', module: 'bookings', title: 'Bookings', note: 'All bookings with amounts and balances',
    path: '/bookings', file: 'fgw-bookings.csv',
    columns: [
      { key: 'booking_ref', label: 'Booking ID' },
      { key: 'customer_name', label: 'Customer' },
      { key: 'customer_phone', label: 'Phone' },
      { key: 'customer_email', label: 'Email' },
      { key: 'trip_name', label: 'Trip' },
      { key: 'trek_start_date', label: 'Travel date', csv: (r) => date(r.trek_start_date) },
      { key: 'trek_end_date', label: 'Return date', csv: (r) => date(r.trek_end_date) },
      { key: 'people', label: 'People' },
      { key: 'travel_mode', label: 'Transport', csv: (r) => label(r.travel_mode) },
      { key: 'pickup_name', label: 'Pickup' },
      { key: 'amount', label: 'Total' },
      { key: 'amount_paid', label: 'Paid' },
      { key: 'balance_amount', label: 'Balance' },
      { key: 'payment_type', label: 'Payment type' },
      { key: 'payment_status', label: 'Payment status' },
      { key: 'status', label: 'Status' },
      { key: 'booked_at', label: 'Booked on', csv: (r) => dateTime(r.booked_at) },
    ],
  },
  {
    id: 'coordination', module: 'coordination', title: 'Trip coordination', note: 'Upcoming departures with team and balances',
    path: '/departures?when=all', file: 'fgw-coordination.csv',
    columns: [
      { key: 'trip_code', label: 'Trip code', csv: (r) => r.trip_code || '' },
      { key: 'trip_name', label: 'Trip' },
      { key: 'start_date', label: 'Travel date', csv: (r) => date(r.start_date) },
      { key: 'end_date', label: 'Return date', csv: (r) => date(r.end_date) },
      { key: 'departure_type', label: 'Type' },
      { key: 'people', label: 'Customers' },
      { key: 'guide_name', label: 'Guide' },
      { key: 'paid_amount', label: 'Collected' },
      { key: 'pending_amount', label: 'Pending' },
      { key: 'trip_status', label: 'Status' },
    ],
  },
  {
    id: 'customers', module: 'customers', title: 'Customers', note: 'Contacts with bookings and spend',
    path: '/customers', file: 'fgw-customers.csv',
    columns: [
      { key: 'name', label: 'Name' },
      { key: 'phone', label: 'Phone' },
      { key: 'email', label: 'Email' },
      { key: 'city', label: 'City' },
      { key: 'bookings', label: 'Bookings' },
      { key: 'total_spent', label: 'Total paid' },
      { key: 'balance_due', label: 'Balance due' },
      { key: 'created_at', label: 'Added', csv: (r) => date(r.created_at) },
    ],
  },
  {
    id: 'enquiries', module: 'enquiries', title: 'Enquiries & leads', note: 'All leads incl. brochure downloads, with source',
    path: '/enquiries', file: 'fgw-enquiries.csv',
    columns: [
      { key: 'name', label: 'Name' },
      { key: 'phone', label: 'Phone' },
      { key: 'email', label: 'Email' },
      { key: 'trip_name', label: 'Trip' },
      { key: 'source', label: 'Source' },
      { key: 'status', label: 'Status' },
      { key: 'assigned_name', label: 'Assigned to' },
      { key: 'note', label: 'Note' },
      { key: 'received_at', label: 'Received', csv: (r) => dateTime(r.received_at) },
    ],
  },
  {
    id: 'payments', module: 'payments', title: 'PhonePe payments', note: 'Online transactions',
    path: '/payments', file: 'fgw-payments.csv', pickRows: (data) => data.online,
    columns: [
      { key: 'merchant_order_id', label: 'Order ID' },
      { key: 'booking_ref', label: 'Booking' },
      { key: 'customer_name', label: 'Customer' },
      { key: 'trip_name', label: 'Trip' },
      { key: 'amount', label: 'Amount' },
      { key: 'status', label: 'Status' },
      { key: 'created_at', label: 'Date', csv: (r) => dateTime(r.created_at) },
    ],
  },
];

export default function Reports() {
  const toast = useToast();
  const { user } = useAdmin();
  const [busy, setBusy] = useState(null);

  const run = async (report) => {
    setBusy(report.id);
    try {
      const { data } = await api(report.path);
      const rows = report.pickRows ? report.pickRows(data) : data;
      if (!rows.length) {
        toast('Nothing to export yet', 'error');
      } else {
        exportCsv(report.file, report.columns, rows);
      }
    } catch (error) {
      toast(error.message, 'error');
    } finally {
      setBusy(null);
    }
  };

  const reports = REPORTS.filter((r) => user.modules.includes(r.module));

  return (
    <>
      <PageHead title="Reports & Exports" subtitle="Download data as CSV files that open in Excel." />

      <div className="stats">
        {reports.map((report) => (
          <div className="card stat" key={report.id}>
            <small>{report.title}</small>
            <p className="muted" style={{ minHeight: 34 }}>{report.note}</p>
            <button className="btn alt" onClick={() => run(report)} disabled={busy === report.id}>
              {busy === report.id ? 'Preparing…' : `Export ${report.title.toLowerCase()}`}
            </button>
          </div>
        ))}
      </div>
    </>
  );
}
