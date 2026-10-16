// Light / dark theme: <html data-theme="dark">, remembered in this browser.
// First visit follows the computer's own setting.
const KEY = 'fgw-admin-theme';

export function savedTheme() {
  try {
    const value = localStorage.getItem(KEY);
    if (value === 'light' || value === 'dark') return value;
  } catch {
    // private window / storage blocked: fall back to the system setting
  }
  return window.matchMedia?.('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
}

export function saveTheme(theme) {
  try {
    localStorage.setItem(KEY, theme);
  } catch {
    // not remembered, still applied for this visit
  }
}

export function applyTheme(theme) {
  document.documentElement.dataset.theme = theme === 'dark' ? 'dark' : 'light';
}
