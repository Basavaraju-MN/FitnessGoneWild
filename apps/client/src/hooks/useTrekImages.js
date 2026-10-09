import { useEffect, useState } from 'react';

// Trek photos live in their own folder:
//   public/images/treks/<slug>/1.jpg ... 5.jpg
// .jpeg, .png and .webp also work (1.png, 2.webp, ...).
const MAX_IMAGES = 5;

const IMAGE_EXTENSIONS = ['jpg', 'jpeg', 'png', 'webp'];

export const getTrekImagePath = (slug, number = 1, extension = 'jpg') =>
  `/images/treks/${encodeURIComponent(slug)}/${number}.${extension}`;

export const FALLBACK_IMAGE = '/images/hero1.jpg';

// One check per slug, shared by every card and the details page.
const imageCache = new Map();

// Resolves true only when the file loads as a real image. A missing
// file served as index.html by the SPA fallback also counts as missing.
const imageExists = (src) =>
  new Promise((resolve) => {
    const image = new Image();
    image.onload = () => resolve(true);
    image.onerror = () => resolve(false);
    image.src = src;
  });

// Path of image <number> in whichever format exists, or null.
// .jpg is tried first, so the usual case needs one request.
const findImage = async (slug, number) => {
  for (const extension of IMAGE_EXTENSIONS) {
    const src = getTrekImagePath(slug, number, extension);
    if (await imageExists(src)) return src;
  }
  return null;
};

const loadTrekImages = (slug) => {
  if (!imageCache.has(slug)) {
    const numbers = Array.from({ length: MAX_IMAGES }, (_, index) => index + 1);

    imageCache.set(
      slug,
      Promise.all(numbers.map((number) => findImage(slug, number))).then(
        (results) => {
          const found = results.filter(Boolean);
          return found.length > 0 ? found : [FALLBACK_IMAGE];
        }
      )
    );
  }

  return imageCache.get(slug);
};

/**
 * Returns only the images that exist for a trek, in order 1 to 5.
 * Until the check finishes it returns just the first image.
 * Pass enabled = false to delay the check (e.g. card not on screen).
 */
export default function useTrekImages(slug, enabled = true) {
  const [images, setImages] = useState(() =>
    slug ? [getTrekImagePath(slug)] : [FALLBACK_IMAGE]
  );

  useEffect(() => {
    if (!slug) {
      setImages([FALLBACK_IMAGE]);
      return undefined;
    }

    setImages([getTrekImagePath(slug)]);
  }, [slug]);

  useEffect(() => {
    if (!slug || !enabled) {
      return undefined;
    }

    let cancelled = false;

    loadTrekImages(slug).then((found) => {
      if (!cancelled) {
        setImages(found);
      }
    });

    return () => {
      cancelled = true;
    };
  }, [slug, enabled]);

  return images;
}
