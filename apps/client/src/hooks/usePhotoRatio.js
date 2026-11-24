import { useEffect, useState } from 'react';
import { photoRatio } from '../utils/photoSize';

/**
 * The shape (width ÷ height) of a photo, for its box on phones (see
 * photoRatio). Read from the photo itself, so it is right even when several
 * trips share the same picture. enabled = false waits (e.g. a card still far
 * off screen), so photos are not downloaded early.
 */
export default function usePhotoRatio(src, enabled = true, tallest = 4 / 5) {
  const [ratio, setRatio] = useState(null);

  useEffect(() => {
    if (!src || !enabled) return undefined;
    let current = true;
    const img = new Image();
    const read = () => { if (current) setRatio(photoRatio(img, tallest)); };
    img.onload = read;
    img.src = src; // the same address as the photo shown: no second download
    if (img.complete && img.naturalWidth) read();
    return () => { current = false; };
  }, [src, enabled, tallest]);

  return ratio;
}
