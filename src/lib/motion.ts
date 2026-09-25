'use client';

import { useLayoutEffect, useEffect, type RefObject } from 'react';
import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';

if (typeof window !== 'undefined') gsap.registerPlugin(ScrollTrigger);

/** Layout effects warn during SSR, so fall back to a plain effect on the server. */
const useIsomorphicLayoutEffect = typeof window === 'undefined' ? useEffect : useLayoutEffect;

export const prefersReducedMotion = () =>
  typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches;

/**
 * Runs a GSAP setup inside a context scoped to `scope`, and reverts it on
 * cleanup so every tween, ScrollTrigger and inline style is undone.
 *
 * Nothing here sets a hidden starting state in CSS: animations are written as
 * `from` tweens applied before paint. A visitor with JavaScript off, or with
 * reduced motion on, therefore sees the finished layout rather than a page
 * waiting for an entrance that never arrives.
 */
export function useMotion(
  scope: RefObject<HTMLElement | null>,
  setup: (context: { self: gsap.Context; reduced: boolean }) => void,
  deps: unknown[] = [],
) {
  useIsomorphicLayoutEffect(() => {
    const reduced = prefersReducedMotion();
    const context = gsap.context(self => setup({ self, reduced }), scope);
    return () => context.revert();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps);
}

export { gsap, ScrollTrigger };
