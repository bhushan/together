import test from 'node:test';
import assert from 'node:assert/strict';
import { liveQuote } from '../src/lib/providers';
import type { MemberInput } from '../src/lib/domain';

const member = (id: string, name: string, origin: string): MemberInput => ({ id, name, origin, startDate: '2026-11-20', endDate: '2026-11-24', budget: 1000, destinationType: 'any', excludedDestinations: [], preferences: '', dealbreakers: '' });
const dubai = { city: 'Dubai', country: 'United Arab Emirates', iata: 'DXB', type: 'city', reason: '' };
const dates = { startDate: '2026-11-20', endDate: '2026-11-24' };

async function withSerpApi(handler: (url: URL) => Response, run: () => Promise<void>) {
  process.env.SERPAPI_API_KEY = 'test';
  const originalFetch = globalThis.fetch;
  globalThis.fetch = async input => handler(new URL(String(input)));
  try { await run(); } finally { globalThis.fetch = originalFetch; }
}

test('an origin with no flights is named with its members instead of failing as a provider error', async () => {
  await withSerpApi(url => {
    if (url.searchParams.get('engine') === 'google_hotels') return Response.json({ properties: [{ name: 'Hotel', total_rate: { extracted_lowest: 500 } }] });
    if (url.searchParams.get('departure_id') === 'XYZ') return Response.json({ error: "Google Flights hasn't returned any results for this query." });
    return Response.json({ best_flights: [{ price: 300 }] });
  }, async () => {
    const { quote, error } = await liveQuote(dubai, [member('a', 'Bhushan', 'XYZ'), member('b', 'Nanthu', 'BLR'), member('c', 'Riya', 'XYZ')], dates, 'INR');
    assert.equal(quote, null);
    assert.equal(error, 'Dubai: no flights found from XYZ (Bhushan, Riya). Check the airport code.');
  });
});

test('a SerpApi outage is still reported as a provider error', async () => {
  await withSerpApi(() => new Response('{}', { status: 503 }), async () => {
    const { error } = await liveQuote(dubai, [member('a', 'Bhushan', 'BOM')], dates, 'INR');
    assert.equal(error, 'Dubai: SerpApi returned 503. Try again later.');
  });
});
