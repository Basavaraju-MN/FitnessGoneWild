// Page addresses without "#": /enquiries locally, /admin/enquiries live.
// BASE_URL is "/" in development and "/admin/" in the production build.
const BASE = import.meta.env.BASE_URL;

export const pagePath = (id) => `${BASE}${id === 'dashboard' ? '' : id}`;

// Page id from the address bar. Old links (/admin/#/enquiries) are
// rewritten to the new form so bookmarks keep working.
export function pageFromLocation() {
  const old = window.location.hash.match(/^#\/?([^?]*)(\?.*)?$/);
  if (old && old[1]) {
    window.history.replaceState(null, '', `${BASE}${old[1]}${old[2] || window.location.search}`);
  }

  const { pathname } = window.location;
  const rest = pathname.startsWith(BASE) ? pathname.slice(BASE.length) : pathname.replace(/^\/+/, '');
  return rest.split('/')[0] || 'dashboard';
}
