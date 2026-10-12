import { useCallback, useEffect, useState } from 'react';

const configured = import.meta.env.VITE_ADMIN_API_URL?.trim().replace(/\/+$/, '');

export const API_URL =
  configured || (import.meta.env.DEV ? 'http://localhost:4100/api/admin' : '/api/admin');

const wait = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

// Loading data (GET) is retried when the server or network has a brief
// problem, e.g. the server waking up or the database dropping a connection.
// Saving (POST/PUT/PATCH) is never retried, so nothing is saved twice.
async function send(path, { method, body }) {
  const retries = method === 'GET' ? 2 : 0;

  for (let attempt = 0; ; attempt += 1) {
    try {
      const response = await fetch(`${API_URL}${path}`, {
        method,
        credentials: 'include',
        headers: body ? { 'Content-Type': 'application/json' } : undefined,
        body: body ? JSON.stringify(body) : undefined,
      });

      if (response.status >= 500 && attempt < retries) {
        await wait(700 * (attempt + 1));
        continue;
      }
      return response;
    } catch (error) {
      if (attempt >= retries) throw new Error('Cannot reach the server. Check your connection and try again.');
      await wait(700 * (attempt + 1));
    }
  }
}

// Returns the whole JSON body: { success, data, ...extra }
export async function api(path, { method = 'GET', body } = {}) {
  const response = await send(path, { method, body });

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
