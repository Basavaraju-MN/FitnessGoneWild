import { useEffect, useMemo, useState } from 'react';
import { exportCsv } from '../format';

// Value used for sorting: a column can give its own (e.g. a number)
const sortValueOf = (column, row) =>
  column.sortValue ? column.sortValue(row) : row[column.key];

// Page buttons to show: first, last, and two either side of the current page
function pageNumbers(page, count) {
  const wanted = new Set([1, count, page - 2, page - 1, page, page + 1, page + 2]);
  const list = [...wanted].filter((n) => n >= 1 && n <= count).sort((a, b) => a - b);
  const out = [];
  list.forEach((n, i) => {
    if (i > 0 && n - list[i - 1] > 1) out.push('…');
    out.push(n);
  });
  return out;
}

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
 * column highlighted), pagination and CSV export of all matching rows.
 *
 * columns: [{ key, label, render?(row), sortValue?(row), csv?(row), sortable?, className? }]
 */
// Long text columns wrap onto the next line (no sideways scrolling for a long trip name)
const WRAP_KEYS = new Set(['trip_name', 'pickup_name', 'customer_name', 'name', 'address', 'note', 'notes', 'detail', 'title', 'reason', 'message', 'label']);
const cellClass = (column) => [column.className || '', column.wrap ?? WRAP_KEYS.has(column.key) ? 'wrap' : ''].join(' ');

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
  pageSize: initialPageSize = 10,
  onRowClick, // optional: click anywhere on a row
  selectedKey, // optional: highlight the row whose rowKey matches
}) {
  const [search, setSearch] = useState('');
  const [sort, setSort] = useState(initialSort || null); // { key, dir: 'asc' | 'desc' }
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(initialPageSize);

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

  const pageCount = Math.max(1, Math.ceil(visibleRows.length / pageSize));

  // New search / sort / data: back to page 1; never past the last page
  useEffect(() => setPage(1), [search, sort, pageSize, rows]);
  useEffect(() => {
    if (page > pageCount) setPage(pageCount);
  }, [page, pageCount]);

  const pageRows = useMemo(
    () => visibleRows.slice((page - 1) * pageSize, page * pageSize),
    [visibleRows, page, pageSize]
  );

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

      {error && <div className="error-box" style={{ margin: 10 }}>{error}</div>}

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
                      cellClass(column),
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
              pageRows.map((row, index) => (
                <tr
                  key={row[rowKey] ?? index}
                  className={onRowClick ? `clickable${row[rowKey] === selectedKey ? ' selected' : ''}` : undefined}
                  // Buttons, links and dropdowns in the row keep their own click
                  onClick={onRowClick ? (event) => !event.target.closest('button, a, select, input') && onRowClick(row) : undefined}
                >
                  {columns.map((column) => (
                    <td
                      key={column.key}
                      className={[
                        sort?.key === column.key ? 'sorted' : '',
                        cellClass(column),
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
          <span>
            {visibleRows.length === 0
              ? `0 of ${rows.length} records`
              : `Showing ${(page - 1) * pageSize + 1}–${Math.min(page * pageSize, visibleRows.length)} of ${visibleRows.length}`}
            {visibleRows.length !== rows.length && ` (filtered from ${rows.length})`}
          </span>

          <div className="pager">
            <label>
              Rows
              <select value={pageSize} onChange={(e) => setPageSize(Number(e.target.value))}>
                {[10, 25, 50, 100].map((n) => <option key={n} value={n}>{n}</option>)}
              </select>
            </label>

            {pageCount > 1 && (
              <div className="pager-pages">
                <button type="button" onClick={() => setPage(1)} disabled={page === 1} aria-label="First page">«</button>
                <button type="button" onClick={() => setPage(page - 1)} disabled={page === 1} aria-label="Previous page">‹</button>
                {pageNumbers(page, pageCount).map((n, i) =>
                  n === '…' ? (
                    <span key={`gap-${i}`} className="pager-gap">…</span>
                  ) : (
                    <button
                      key={n}
                      type="button"
                      className={n === page ? 'active' : ''}
                      onClick={() => setPage(n)}
                      aria-current={n === page ? 'page' : undefined}
                    >
                      {n}
                    </button>
                  )
                )}
                <button type="button" onClick={() => setPage(page + 1)} disabled={page === pageCount} aria-label="Next page">›</button>
                <button type="button" onClick={() => setPage(pageCount)} disabled={page === pageCount} aria-label="Last page">»</button>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
