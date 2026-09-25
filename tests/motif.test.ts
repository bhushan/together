import test from 'node:test';
import assert from 'node:assert/strict';
import { MOTIF_SCHEMES, motifFor } from '../src/lib/motif';

test('a motif is fully determined by its seed', () => {
  assert.deepEqual(motifFor('Lisbon, Portugal'), motifFor('Lisbon, Portugal'));
  assert.notDeepEqual(motifFor('Lisbon, Portugal'), motifFor('Hanoi, Vietnam'));
});

test('every motif stays inside the palette and drawable bounds', () => {
  const seeds = ['', 'a', 'Lisbon', 'Reykjavik, Iceland', 'Ho Chi Minh City', 'ζ unicode ✈'];
  for (const seed of seeds) {
    const motif = motifFor(seed);
    assert.ok(MOTIF_SCHEMES.includes(motif.scheme), `${seed} uses an off-palette scheme`);
    assert.ok(motif.ridges.length >= 2 && motif.ridges.length <= 4, `${seed} has ${motif.ridges.length} ridges`);
    assert.ok(motif.horizon > 0.5 && motif.horizon < 0.9, `${seed} horizon ${motif.horizon}`);
    assert.ok(motif.sun.y > 0 && motif.sun.y < motif.horizon, `${seed} sun sits below its horizon`);
    assert.ok(motif.sun.x > 0.1 && motif.sun.x < 0.9, `${seed} sun ${motif.sun.x} leaves the frame`);
    for (const ridge of motif.ridges) {
      assert.ok(ridge.points.length >= 4, `${seed} ridge is too coarse to draw`);
      assert.ok(ridge.points.every(point => point >= 0 && point <= 1), `${seed} ridge leaves the frame`);
      assert.ok(ridge.depth >= 0 && ridge.depth <= 1, `${seed} ridge depth ${ridge.depth}`);
    }
  }
});

test('ridges are layered front to back so the fill order reads as depth', () => {
  for (const seed of ['Lisbon', 'Oslo', 'Cusco', 'Da Nang']) {
    const depths = motifFor(seed).ridges.map(ridge => ridge.depth);
    assert.deepEqual(depths, [...depths].sort((a, b) => a - b), `${seed} ridges are out of order`);
  }
});

test('nearby seeds still produce visibly different motifs', () => {
  const signatures = ['Lisbon', 'Lisbou', 'Lisbon ', 'Nisbon'].map(seed => JSON.stringify(motifFor(seed)));
  assert.equal(new Set(signatures).size, signatures.length);
});
