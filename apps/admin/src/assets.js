// Files in apps/admin/public, under /admin/ in production
export const LOGO_URL = `${import.meta.env.BASE_URL}logo.png`;

// The customer website, where trip photos are served from:
//   development: the website's dev server (it serves apps/client/public)
//   production:  same domain as the admin (thefitnessgonewild.in)
const configuredSite = import.meta.env.VITE_SITE_URL?.trim().replace(/\/+$/, '');
export const SITE_URL = configuredSite ?? (import.meta.env.DEV ? 'http://localhost:5173' : '');

export const siteUrl = (path) => (path ? `${SITE_URL}${path}` : null);
