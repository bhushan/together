import test from 'node:test';
import assert from 'node:assert/strict';
import { overlapDates, assessCandidate, rankOptions, validateSubmission } from '../src/lib/domain';

const members = [
  { id: 'a', name: 'Riya', origin: 'DEL', startDate: '2026-12-01', endDate: '2026-12-10', budget: 800, destinationType: 'beach', excludedDestinations: ['Goa'], preferences: 'sun', dealbreakers: '' },
  { id: 'b', name: 'Sam', origin: 'BOM', startDate: '2026-12-04', endDate: '2026-12-08', budget: 700, destinationType: 'beach', excludedDestinations: [], preferences: 'quiet', dealbreakers: '' },
];

test('date overlap uses the latest start and earliest end', () => {
  assert.deepEqual(overlapDates(members), { startDate: '2026-12-04', endDate: '2026-12-08' });
  assert.equal(overlapDates([{ ...members[0], endDate: '2026-12-02' }, members[1]]), null);
});

test('submission rejects invalid dates, budget, and origin code', () => {
  assert.equal(validateSubmission({ ...members[0], endDate: '2026-11-01' }).ok, false);
  assert.equal(validateSubmission({ ...members[0], startDate: '2026-02-30' }).ok, false);
  assert.equal(validateSubmission({ ...members[0], budget: 0 }).ok, false);
  assert.equal(validateSubmission({ ...members[0], origin: 'Delhi' }).ok, false);
  assert.equal(validateSubmission(members[0]).ok, true);
});

test('candidate cannot pass excluded destination or personal budget', () => {
  const quote = { flightPrices: { a: 300, b: 450 }, hotelTotal: 300, currency: 'USD', quotedAt: '2026-09-24T00:00:00Z', hotelName: 'Test Hotel', flightLinks: {}, hotelLink: '' };
  assert.equal(assessCandidate({ city: 'Goa', country: 'India', iata: 'GOI', type: 'beach', reason: '' }, members, quote).feasible, false);
  assert.equal(assessCandidate({ city: 'Bali', country: 'Indonesia', iata: 'DPS', type: 'beach', reason: '' }, members, { ...quote, flightPrices: { a: 900, b: 450 } }).feasible, false);
  assert.equal(assessCandidate({ city: 'Bali', country: 'Indonesia', iata: 'DPS', type: 'beach', reason: '' }, members, quote).feasible, true);
});

test('missing live prices cannot become a feasible option', () => {
  const result = assessCandidate({ city: 'Bali', country: 'Indonesia', iata: 'DPS', type: 'beach', reason: '' }, members, null);
  assert.equal(result.feasible, false);
  assert.deepEqual(result.issues, ['Live flight or hotel price unavailable.', 'No live flight price for Riya.', 'No live flight price for Sam.']);
  assert.equal(result.positions[0].position, 'Price unavailable');
});

test('ranking favors group compatibility then price', () => {
  const ranked = rankOptions([{ score: 80, totalCost: 1000 }, { score: 90, totalCost: 1200 }, { score: 80, totalCost: 900 }]);
  assert.deepEqual(ranked.map(x => x.totalCost), [1200, 900, 1000]);
});
