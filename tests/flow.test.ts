import test from 'node:test';
import assert from 'node:assert/strict';
import { POST as createTrip } from '../src/app/api/trips/route';
import { GET as getTrip, POST as tripAction } from '../src/app/api/trips/[slug]/route';

test('five people can join, edit, resolve a conflict, vote, lock, and keep prior rounds', async () => {
  process.env.SUPABASE_URL = 'https://db.example.test';
  process.env.SUPABASE_SECRET_KEY = 'sb_secret_test';
  process.env.GEMINI_API_KEY = 'test';
  process.env.AMADEUS_CLIENT_ID = 'test';
  process.env.AMADEUS_CLIENT_SECRET = 'test';
  const rows: Record<string, Record<string, unknown>[]> = { trips: [], members: [], rounds: [], options: [], votes: [] };
  let sequence = 0;
  let failOffers = false;
  const originalFetch = globalThis.fetch;
  globalThis.fetch = async (input, init) => {
    const url = new URL(String(input));
    if (url.hostname === 'db.example.test') {
      const table = url.pathname.split('/').at(-1)!;
      let found = rows[table];
      for (const [key, value] of url.searchParams) if (value.startsWith('eq.')) found = found.filter(row => String(row[key]) === decodeURIComponent(value.slice(3)));
      if (init?.method === 'POST') {
        const body = JSON.parse(String(init.body));
        const additions: Record<string, unknown>[] = (Array.isArray(body) ? body : [body]).map((item: Record<string, unknown>) => ({ id: `id-${++sequence}`, created_at: new Date(Date.now() + sequence * 1000).toISOString(), ...item }));
        if (table === 'votes') {
          for (const vote of additions) { rows.votes = rows.votes.filter(old => old.round_id !== vote.round_id || old.member_id !== vote.member_id); rows.votes.push(vote); }
        } else rows[table].push(...additions);
        return Response.json(additions);
      }
      if (init?.method === 'PATCH') { const body = JSON.parse(String(init.body)); for (const row of found) Object.assign(row, body); return Response.json(found); }
      const order = url.searchParams.get('order');
      if (order) { const [field, direction] = order.split(',')[0].split('.'); found = [...found].sort((a, b) => (typeof a[field] === 'number' && typeof b[field] === 'number' ? (a[field] as number) - (b[field] as number) : String(a[field]).localeCompare(String(b[field]))) * (direction === 'desc' ? -1 : 1)); }
      const limit = Number(url.searchParams.get('limit'));
      return Response.json(limit ? found.slice(0, limit) : found);
    }
    if (url.hostname === 'generativelanguage.googleapis.com') return Response.json({ candidates: [{ content: { parts: [{ text: JSON.stringify({ candidates: [
      { city: 'Bali', country: 'Indonesia', iata: 'DPS', type: 'beach', reason: 'Warm beaches and varied stays.' },
      { city: 'Singapore', country: 'Singapore', iata: 'SIN', type: 'city', reason: 'Easy city break.' },
    ] }) }] } }] });
    if (url.pathname.endsWith('/oauth2/token')) return Response.json({ access_token: 'test', expires_in: 1800 });
    if (failOffers) return new Response('{}', { status: 503 });
    if (url.pathname.endsWith('/hotels/by-city')) return Response.json({ data: [{ hotelId: 'HOTEL1' }] });
    if (url.pathname.endsWith('/hotel-offers')) return Response.json({ data: [{ hotel: { name: 'Hotel One' }, offers: [{ price: { total: '500' } }] }] });
    if (url.pathname.endsWith('/flight-offers')) return Response.json({ data: [{ price: { grandTotal: '300' } }] });
    return new Response('{}', { status: 404 });
  };
  try {
    const post = (slug: string, action: string, token = '', extra: Record<string, unknown> = {}) => tripAction(new Request(`https://app.example.test/api/trips/${slug}`, { method: 'POST', headers: { 'Content-Type': 'application/json', 'x-member-token': token }, body: JSON.stringify({ action, ...extra }) }), { params: Promise.resolve({ slug }) });
    const get = async (slug: string, token = '') => (await getTrip(new Request(`https://app.example.test/api/trips/${slug}`, { headers: { 'x-member-token': token } }), { params: Promise.resolve({ slug }) })).json();
    const created = await (await createTrip(new Request('https://app.example.test/api/trips', { method: 'POST', body: JSON.stringify({ title: 'Friends away', name: 'Riya', currency: 'USD' }) }))).json();
    assert.ok(created.slug && created.token);
    const tokens = [created.token];
    for (const name of ['Sam', 'Alex', 'Jo', 'Kim']) tokens.push((await (await post(created.slug, 'join', '', { name })).json()).token);
    assert.equal((await get(created.slug)).members.length, 5);
    for (let i = 0; i < 5; i++) assert.equal((await post(created.slug, 'submit', tokens[i], { origin: ['DEL', 'BOM', 'BLR', 'HYD', 'MAA'][i], startDate: i === 4 ? '2026-12-20' : '2026-12-04', endDate: i === 4 ? '2026-12-25' : '2026-12-10', budget: 1000, destinationType: 'beach', excludedDestinations: '', preferences: 'warm', dealbreakers: '' })).status, 200);
    assert.equal((await post(created.slug, 'generate', tokens[0])).status, 200);
    assert.match((await get(created.slug)).round.issues[0], /no shared date/i);
    await post(created.slug, 'submit', tokens[4], { origin: 'MAA', startDate: '2026-12-04', endDate: '2026-12-10', budget: 1000, destinationType: 'beach', excludedDestinations: '', preferences: 'warm', dealbreakers: '' });
    assert.equal((await post(created.slug, 'generate', tokens[0])).status, 200);
    const ready = await get(created.slug, tokens[0]);
    assert.equal(ready.round.status, 'ready');
    assert.equal(ready.round.options.length, 2);
    const chosen = ready.round.options[0].id;
    for (const memberToken of tokens) assert.equal((await post(created.slug, 'vote', memberToken, { optionId: chosen })).status, 200);
    assert.equal((await get(created.slug)).round.tally[chosen], 5);
    assert.equal((await post(created.slug, 'lock', tokens[0], { optionId: chosen })).status, 200);
    assert.equal((await get(created.slug)).round.locked_option_id, chosen);
    failOffers = true;
    assert.equal((await post(created.slug, 'generate', tokens[0])).status, 200);
    const failed = await get(created.slug);
    assert.equal(failed.round.status, 'conflict');
    assert.match(failed.round.issues.join(' '), /Amadeus.*503/);
    assert.equal(failed.previousRounds.length, 2);
    assert.equal(failed.previousRounds[0].lockedChoice, 'Bali');
  } finally { globalThis.fetch = originalFetch; }
});
