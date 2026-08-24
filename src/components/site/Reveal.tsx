'use client';

import { useEffect, useRef, useState } from 'react';
import type { ReactNode } from 'react';

/**
 * Fade-and-lift on first intersection. Fires once — re-animating on scroll-back is a tell.
 *
 * Starts visible when IntersectionObserver is unavailable, so a section can never be stranded at
 * zero opacity.
 */
export function Reveal({ children, delay = 0 }: { children: ReactNode; delay?: number }) {
  const ref = useRef<HTMLDivElement>(null);
  const [shown, setShown] = useState(false);

  useEffect(() => {
    const node = ref.current;
    if (!node || typeof IntersectionObserver === 'undefined') {
      setShown(true);
      return;
    }
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setShown(true);
          observer.disconnect();
        }
      },
      { rootMargin: '0px 0px -12% 0px' },
    );
    observer.observe(node);
    return () => observer.disconnect();
  }, []);

  return (
    <div
      ref={ref}
      className={shown ? 'reveal reveal-in' : 'reveal'}
      style={{ transitionDelay: `${delay}ms` }}
    >
      {children}
    </div>
  );
}
