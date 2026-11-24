// Photos are sent in the size the screen needs: the server makes smaller,
// compressed copies of trip, hero and About photos (…?v=…&w=800), so a
// phone downloads about 100 KB instead of the full 500–900 KB photo.
// Other images (built-in /images/… files) are left as they are.
const SIZES = [480, 800, 1200, 1600];
const OURS = /\/(trip-photo|hero-photo|about-photo)\//;

/** The photo's address at the given width (only our own photos) */
export function sized(url, width) {
  if (!url || !width || !OURS.test(url) || /[?&]w=/.test(url)) return url;
  return `${url}${url.includes('?') ? '&' : '?'}w=${width}`;
}

/**
 * The size to ask for a photo shown cssWidth pixels wide on this screen
 * (sharp screens get more pixels, up to 2×). Default: the screen width.
 */
export function widthFor(cssWidth) {
  if (typeof window === 'undefined') return 1600;
  const shown = Math.min(cssWidth || window.innerWidth, window.innerWidth);
  const needed = shown * Math.min(window.devicePixelRatio || 1, 2);
  return SIZES.find((size) => size >= needed) || SIZES[SIZES.length - 1];
}

/**
 * The shape (width ÷ height) for a photo box on phones, from the cover photo
 * once it has loaded: the box takes the photo's own shape so it shows full,
 * kept between `tallest` (default 4:5) and 16:9 (wide) so a box is never too
 * tall or flat.
 */
export function photoRatio(img, tallest = 4 / 5) {
  const ratio = img?.naturalWidth && img?.naturalHeight ? img.naturalWidth / img.naturalHeight : 0;
  return ratio ? Math.min(16 / 9, Math.max(tallest, ratio)) : null;
}
