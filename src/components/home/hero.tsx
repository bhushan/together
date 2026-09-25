'use client';

import Image from 'next/image';
import { useRef } from 'react';
import { SiteHeader } from '@/components/site-chrome';
import { useMotion, gsap, ScrollTrigger } from '@/lib/motion';
import lakeBraies from '@/assets/img/lake-braies.jpg';

/**
 * The one orchestrated moment on the site: the photograph settles, the
 * headline rises a line at a time, and the chrome fades in behind it. Nothing
 * else on the page animates on its own.
 */
export function Hero() {
  const root = useRef<HTMLElement>(null);

  useMotion(root, ({ reduced }) => {
    if (reduced) return;

    gsap.timeline({ defaults: { ease: 'power3.out' } })
      .from('.hero-media', { scale: 1.12, duration: 1.8, ease: 'power2.out' })
      .from('.hero-title .line > span', { yPercent: 112, duration: 1.1, stagger: 0.09 }, 0.15)
      .from('.hero-caption', { opacity: 0, y: 12, duration: 0.7 }, 0.75)
      .from('.site-header.on-photo', { opacity: 0, duration: 0.7 }, 0.55);

    // A slow drift as the hero scrolls away, so the photograph keeps some depth.
    gsap.to('.hero-media', {
      yPercent: 9,
      ease: 'none',
      scrollTrigger: { trigger: root.current, start: 'top top', end: 'bottom top', scrub: true },
    });

    ScrollTrigger.refresh();
  }, []);

  return (
    <section className="hero" ref={root}>
      <div className="hero-media">
        <Image
          src={lakeBraies}
          alt="A wooden rowing boat pointed across the green water of Lago di Braies towards the Dolomites"
          placeholder="blur"
          priority
          fetchPriority="high"
          quality={72}
          sizes="100vw"
        />
      </div>

      <SiteHeader onPhoto />

      <div className="hero-body shell">
        <h1 className="display-hero hero-title">
          <span className="line"><span>Good trips start</span></span>
          <span className="line"><span>with everyone.</span></span>
        </h1>
        <p className="hero-caption">Lago di Braies, Dolomites</p>
      </div>
    </section>
  );
}
