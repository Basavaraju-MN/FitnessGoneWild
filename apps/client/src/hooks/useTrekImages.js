import { useMemo } from 'react';
import { API_BASE_URL } from '../api/treks';

// Trek photos are kept in the database (admin → Packages & Trips). Every
// trip from the API carries its photos in order, cover first:
//   trek.photos = ['/trip-photo/<trip id>/1?v=…', '/trip-photo/<trip id>/2?v=…', …]
export const FALLBACK_IMAGE = '/images/hero1.jpg';

// The server that sends the photos: this site in production; the API
// server (http://localhost:4000) while developing
const PHOTO_ORIGIN = API_BASE_URL.replace(/\/api$/, '');

/**
 * The trek's photos (addresses ready for <img src>), or the fallback
 * image when the trek has none yet.
 */
export default function useTrekImages(trek) {
  const photos = trek?.photos;

  return useMemo(() => {
    const list = Array.isArray(photos) ? photos.filter(Boolean) : [];
    return list.length > 0
      ? list.map((src) => (src.startsWith('/') ? `${PHOTO_ORIGIN}${src}` : src))
      : [FALLBACK_IMAGE];
  }, [photos]);
}
