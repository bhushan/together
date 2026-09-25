/**
 * Every destination a round proposes is generated at runtime, so there is no
 * photograph we can honestly attach to it. Instead each option gets a horizon:
 * a small landscape drawn from the palette and derived entirely from the
 * destination's name, so the same place always looks the same and no place is
 * ever illustrated with a picture of somewhere else.
 */

export type MotifScheme = {
  id: string;
  skyTop: string;
  skyLow: string;
  sun: string;
  ridge: string;
};

export const MOTIF_SCHEMES: MotifScheme[] = [
  { id: 'deepwater', skyTop: '#0b2026', skyLow: '#55a39a', sun: '#e8b855', ridge: '#04141a' },
  { id: 'lowsun', skyTop: '#16323a', skyLow: '#d6a85c', sun: '#fbeecd', ridge: '#081b20' },
  { id: 'saltflat', skyTop: '#1d4a4c', skyLow: '#dde5dc', sun: '#c1863a', ridge: '#0b2024' },
  { id: 'monsoon', skyTop: '#0a1a1e', skyLow: '#6fa396', sun: '#f0d296', ridge: '#041013' },
  { id: 'highaltitude', skyTop: '#123c4a', skyLow: '#b6d0c8', sun: '#d9a441', ridge: '#07191f' },
  { id: 'brasshour', skyTop: '#1a3138', skyLow: '#c08c3f', sun: '#fbe6bc', ridge: '#07171b' },
];

export type MotifRidge = {
  /** 0 is the furthest ridge, 1 the nearest. Ridges are listed in painting order. */
  depth: number;
  /** Ridge heights from the left edge to the right, 0 at the top of the frame. */
  points: number[];
};

export type Motif = {
  scheme: MotifScheme;
  /** Where the water line sits, as a fraction of the frame height. */
  horizon: number;
  sun: { x: number; y: number; r: number };
  ridges: MotifRidge[];
};

/** FNV-1a. Small, stable across runtimes, and well spread for short strings. */
function hash(seed: string) {
  let value = 0x811c9dc5;
  for (let index = 0; index < seed.length; index += 1) {
    value ^= seed.charCodeAt(index);
    value = Math.imul(value, 0x01000193);
  }
  return value >>> 0;
}

/** Mulberry32: one hash in, an endless stream of stable numbers out. */
function stream(seed: number) {
  let state = seed || 1;
  return () => {
    state = (state + 0x6d2b79f5) >>> 0;
    let value = Math.imul(state ^ (state >>> 15), 1 | state);
    value = (value + Math.imul(value ^ (value >>> 7), 61 | value)) ^ value;
    return ((value ^ (value >>> 14)) >>> 0) / 4294967296;
  };
}

const between = (next: () => number, low: number, high: number) => low + next() * (high - low);

export function motifFor(seed: string): Motif {
  const next = stream(hash(seed));
  const scheme = MOTIF_SCHEMES[Math.floor(next() * MOTIF_SCHEMES.length)];
  const horizon = Number(between(next, 0.62, 0.82).toFixed(4));
  const sun = {
    x: Number(between(next, 0.18, 0.84).toFixed(4)),
    y: Number((horizon * between(next, 0.3, 0.78)).toFixed(4)),
    r: Number(between(next, 0.05, 0.1).toFixed(4)),
  };
  const count = 2 + Math.floor(next() * 3);
  const ridges: MotifRidge[] = [];
  for (let layer = 0; layer < count; layer += 1) {
    const depth = Number(((layer + 1) / (count + 1)).toFixed(4));
    // Distant ridges rise high and stay smooth; near ones sit against the
    // horizon and break up, which is what reads as depth once they are filled.
    const crest = between(next, 0.12, 0.34) * (1 - depth * 0.6);
    const jaggedness = between(next, 0.3, 1) * crest;
    const resolution = 5 + Math.floor(next() * 4);
    const points = Array.from({ length: resolution }, () =>
      Number(Math.min(1, Math.max(0, horizon - crest + (next() - 0.5) * jaggedness)).toFixed(4)),
    );
    ridges.push({ depth, points });
  }
  return { scheme, horizon, sun, ridges };
}
