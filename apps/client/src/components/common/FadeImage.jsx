import { useEffect, useState } from 'react';

// How long one photo takes to fade into the next (keep in step with .fade-top in global.css)
const FADE_MS = 700;

/**
 * An <img> that fades smoothly to a new photo instead of jumping: the new
 * photo is laid on top, fades in once it has loaded, then replaces the old one.
 * Takes the same props as <img> (src, alt, className, onError…).
 */
export default function FadeImage({ src, onError, ...imgProps }) {
  const [base, setBase] = useState(src);
  const [top, setTop] = useState(null); // { src, ready }

  useEffect(() => {
    if (src === base) {
      setTop(null);
      return;
    }
    setTop({ src, ready: false });
  }, [src]); // eslint-disable-line react-hooks/exhaustive-deps

  // Faded in: the new photo becomes the only one
  useEffect(() => {
    if (!top?.ready) return undefined;
    const timer = setTimeout(() => {
      setBase(top.src);
      setTop(null);
    }, FADE_MS);
    return () => clearTimeout(timer);
  }, [top]);

  return (
    <>
      <img {...imgProps} src={base} onError={onError} />
      {top && (
        <img
          {...imgProps}
          key={top.src}
          src={top.src}
          alt=""
          aria-hidden="true"
          loading="eager"
          className={`${imgProps.className || ''} fade-top ${top.ready ? 'is-ready' : ''}`.trim()}
          // Two frames after loading, so it is drawn see-through first and fades in
          onLoad={() => requestAnimationFrame(() => requestAnimationFrame(
            () => setTop((t) => (t && t.src === top.src ? { ...t, ready: true } : t))
          ))}
          onError={() => setTop(null)}
        />
      )}
    </>
  );
}
