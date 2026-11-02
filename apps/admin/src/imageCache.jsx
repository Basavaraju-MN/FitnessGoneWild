import { useEffect, useState } from 'react';

// Trip and hero photos are kept in the browser (Cache Storage), so each
// photo downloads once and then shows at once: on every screen, after a
// refresh and in new tabs. Logout clears them.
// Safe because a replaced photo always gets a new address (trip photos
// end with ?v=<time>, a new hero photo gets a new file name).
const CACHE_NAME = 'fgw-admin-photos';

const memory = new Map(); // url -> Promise of a blob: URL (this page only)

async function load(url) {
  try {
    const cache = await caches.open(CACHE_NAME);
    let response = await cache.match(url);
    if (!response) {
      response = await fetch(url);
      if (!response.ok) return url;
      // An older version of the same photo is no longer needed
      const path = new URL(url, window.location.href).href.split('?')[0];
      for (const old of await cache.keys()) {
        if (old.url.split('?')[0] === path) await cache.delete(old);
      }
      await cache.put(url, response.clone());
    }
    return URL.createObjectURL(await response.blob());
  } catch {
    // No Cache Storage (private window, plain http): the browser loads it normally
    return url;
  }
}

const cachedPhoto = (url) => {
  if (!memory.has(url)) memory.set(url, load(url));
  return memory.get(url);
};

const isRemote = (url) => Boolean(url) && !url.startsWith('data:') && !url.startsWith('blob:');

/** The photo's address to put in <img src> (null until it is ready). */
export function useCachedPhoto(url) {
  const [src, setSrc] = useState(isRemote(url) ? null : url);

  useEffect(() => {
    if (!isRemote(url)) {
      setSrc(url);
      return undefined;
    }
    let cancelled = false;
    setSrc(null);
    cachedPhoto(url).then((ready) => {
      if (!cancelled) setSrc(ready);
    });
    return () => {
      cancelled = true;
    };
  }, [url]);

  return src;
}

/** <img> that uses the kept photo. */
export function CachedImg({ src, alt = '', ...props }) {
  const ready = useCachedPhoto(src);
  return ready ? <img src={ready} alt={alt} {...props} /> : null;
}

/** Logout: forget every kept photo. */
export async function clearPhotoCache() {
  for (const pending of memory.values()) {
    pending.then((ready) => ready.startsWith('blob:') && URL.revokeObjectURL(ready));
  }
  memory.clear();
  try {
    await caches.delete(CACHE_NAME);
  } catch {
    // nothing kept
  }
}
