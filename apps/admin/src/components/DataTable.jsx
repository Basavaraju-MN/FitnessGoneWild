import { useMemo, useState } from 'react';
import { exportCsv } from '../format';

// Value used for sorting: a column can give its own (e.g. a number)
const sortValueOf = (column, row) =>
  column.sortValue ? column.sortValue(row) : row[column.key];

function compare(a, b) {
  const emptyA = a === null || a === undefined || a === '';
  const emptyB = b === null || b === undefined || b === '';
  if (emptyA || emptyB) return emptyA === emptyB ? 0 : emptyA ? 1 : -1; // empties last

  const numA = Number(a);
  const numB = Number(b);
  if (!Number.isNaN(numA) && !Number.isNaN(numB) && a !== '' && b !== '') {
    return numA - numB;
  }

  return String(a).localeCompare(String(b), 'en', { numeric: true, sensitivity: 'base' });
}

/**
 * Table with search, click-to-sort headers (▲ asc / ▼ desc, sorted
 * column highlighted) and CSV export of the visible rows.
 *
 * columns: [{ key, label, render?(row), sortValue?(row), csv?(row), sortable?, className? }]
 */
export default function DataTable({
  title,
  subtitle,
  columns,
  rows,
  loading,
  error,
  searchPlaceholder = 'Search…',
  exportName,
  actions,
  initialSort,
  emptyText = 'Nothing to show yet.',
  rowKey = 'id',
}) {
  const [search, setSearch] = useState('');
  const [sort, setSort] = useState(initialSort || null); // { key, dir: 'asc' | 'desc' }

  const visibleRows = useMemo(() => {
    let list = rows || [];

    const term = search.trim().toLowerCase();
    if (term) {
      list = list.filter((row) =>
        columns.some((column) => {
          const value = column.csv ? column.csv(row) : row[column.key];
          return String(value ?? '').toLowerCase().includes(term);
        })
      );
    }

    if (sort) {
      const column = columns.find((c) => c.key === sort.key);
      if (column) {
        const direction = sort.dir === 'desc' ? -1 : 1;
        list = [...list].sort(
          (a, b) => compare(sortValueOf(column, a), sortValueOf(column, b)) * direction
        );
      }
    }

    return list;
  }, [rows, columns, search, sort]);

  // First click: ascending; clicking the same column again flips it
  const toggleSort = (key) => {
    setSort((current) =>
      current?.key === key
        ? { key, dir: current.dir === 'asc' ? 'desc' : 'asc' }
        : { key, dir: 'asc' }
    );
  };

  const exportColumns = columns.filter((c) => c.label && c.export !== false);

  return (
    <div className="card">
      {(title || exportName || actions || searchPlaceholder) && (
        <div className="cardhead">
          <div>
            {title && <h2>{title}</h2>}
            {subtitle && <p>{subtitle}</p>}
          </div>
          <div className="toolbar">
            {actions}
            {searchPlaceholder && (
              <input
                placeholder={searchPlaceholder}
                value={search}
                onChange={(event) => setSearch(event.target.value)}
              />
            )}
            {exportName && (
              <button
                type="button"
                className="btn alt"
                onClick={() => exportCsv(exportName, exportColumns, visibleRows)}
                disabled={!visibleRows.length}
              >
                Export CSV
              </button>
            )}
          </div>
        </div>
      )}

      {error && <div className="error-box" style={{ margin: 15 }}>{error}</div>}

      <div className="tablewrap">
        <table className="table">
          <thead>
            <tr>
              {columns.map((column) => {
                const sortable = column.sortable !== false && column.label;
                const isSorted = sort?.key === column.key;
                return (
                  <th
                    key={column.key}
                    className={[
                      sortable ? 'sortable' : '',
                      isSorted ? 'sorted' : '',
                      column.className || '',
                    ].join(' ')}
                    onClick={sortable ? () => toggleSort(column.key) : undefined}
                    aria-sort={isSorted ? (sort.dir === 'asc' ? 'ascending' : 'descending') : undefined}
                    title={sortable ? 'Click to sort' : undefined}
                  >
                    {column.label}
                    {sortable && (
                      <span className="sort-arrow">
                        {isSorted ? (sort.dir === 'asc' ? '▲' : '▼') : '↕'}
                      </span>
                    )}
                  </th>
                );
              })}
            </tr>
          </thead>
          <tbody>
            {loading && !rows ? (
              <tr><td colSpan={columns.length} className="loading">Loading…</td></tr>
            ) : visibleRows.length === 0 ? (
              <tr><td colSpan={columns.length} className="empty">{search ? 'No matches.' : emptyText}</td></tr>
            ) : (
              visibleRows.map((row, index) => (
                <tr key={row[rowKey] ?? index}>
                  {columns.map((column) => (
                    <td
                      key={column.key}
                      className={[
                        sort?.key === column.key ? 'sorted' : '',
                        column.className || '',
                      ].join(' ')}
                    >
                      {column.render ? column.render(row) : row[column.key] ?? '—'}
                    </td>
                  ))}
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {rows && rows.length > 0 && (
        <div className="table-foot">
          {visibleRows.length === rows.length
            ? `${rows.length} records`
            : `${visibleRows.length} of ${rows.length} records`}
        </div>
      )}
    </div>
  );
}
