import { useCallback, useEffect, useState } from 'react';

const configured = import.meta.env.VITE_ADMIN_API_URL?.trim().replace(/\/+$/, '');

export const API_URL =
  configured || (import.meta.env.DEV ? 'http://localhost:4100/api/admin' : '/api/admin');

// Returns the whole JSON body: { success, data, ...extra }
export async function api(path, { method = 'GET', body } = {}) {
  const response = await fetch(`${API_URL}${path}`, {
    method,
    credentials: 'include',
    headers: body ? { 'Content-Type': 'application/json' } : undefined,
    body: body ? JSON.stringify(body) : undefined,
  });

  let json = null;
  try {
    json = await response.json();
  } catch {
    // not JSON
  }

  if (response.status === 401 && !path.startsWith('/auth/')) {
    window.dispatchEvent(new Event('admin:unauthorized'));
  }

  if (!response.ok || !json?.success) {
    throw new Error(json?.message || `Request failed (${response.status})`);
  }

  return json;
}

// Loads a GET endpoint; reload() fetches it again
export function useApi(path) {
  const [state, setState] = useState({ data: null, extra: {}, loading: true, error: '' });

  const load = useCallback(async () => {
    if (!path) return;
    setState((s) => ({ ...s, loading: true, error: '' }));
    try {
      const { data, success, ...extra } = await api(path);
      setState({ data, extra, loading: false, error: '' });
    } catch (error) {
      setState((s) => ({ ...s, loading: false, error: error.message }));
    }
  }, [path]);

  useEffect(() => {
    load();
  }, [load]);

  return { ...state, reload: load };
}
