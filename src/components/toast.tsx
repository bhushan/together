'use client';

import { useRef } from 'react';
import { useMotion, gsap } from '@/lib/motion';

export function Toast({ message, tone, onDismiss }: { message: string; tone: 'info' | 'error'; onDismiss: () => void }) {
  const root = useRef<HTMLDivElement>(null);

  useMotion(root, ({ reduced }) => {
    if (reduced) return;
    gsap.from(root.current, { y: 16, opacity: 0, duration: 0.35, ease: 'power3.out' });
  }, [message]);

  return (
    <div className={tone === 'error' ? 'toast is-error' : 'toast'} role="status" ref={root}>
      <span>{message}</span>
      <button onClick={onDismiss} aria-label="Dismiss">×</button>
    </div>
  );
}
