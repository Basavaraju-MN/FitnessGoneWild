// "Came from": where a website lead or booking came from (Instagram ad,
// Facebook ad, Google search, ...) and the ad campaign, as saved by the website.

const icon = (source) => {
  const text = String(source || '').toLowerCase();
  if (text.includes('instagram')) return '📸';
  if (text.includes('facebook') || text.includes('messenger') || text.includes('meta')) return '📘';
  if (text.includes('google') || text.includes('bing')) return '🔎';
  if (text.includes('youtube')) return '▶️';
  if (text.includes('whatsapp')) return '💬';
  if (text.includes('direct')) return '🔗';
  return '🌐';
};

export const isAd = (source) => / ad$/i.test(String(source || ''));

export const cameFromText = (row) =>
  [row.traffic_source, row.traffic_campaign].filter(Boolean).join(' · ');

export default function CameFrom({ row }) {
  if (!row?.traffic_source) return <span className="muted">—</span>;
  return (
    <span title={cameFromText(row)}>
      <span className="source-pill" style={isAd(row.traffic_source) ? { background: 'var(--cp-brand-blue-20)', color: 'var(--cp-brand-blue)' } : undefined}>
        {icon(row.traffic_source)} {row.traffic_source}
      </span>
      {row.traffic_campaign && (
        <>
          <br />
          <span className="muted" style={{ fontSize: 11 }}>{row.traffic_campaign}</span>
        </>
      )}
    </span>
  );
}

// Column for DataTable lists
export const cameFromColumn = {
  key: 'traffic_source',
  label: 'Came from',
  sortValue: (r) => r.traffic_source || '',
  csv: (r) => cameFromText(r),
  render: (r) => <CameFrom row={r} />,
};
