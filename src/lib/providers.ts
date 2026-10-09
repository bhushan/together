import type { Candidate, MemberInput, Quote } from './domain';

function required(name: string) {
  const value = process.env[name];
  if (!value) throw new Error(`${name} is not configured.`);
  return value;
}

export async function suggestCandidates(members: MemberInput[], dates: { startDate: string; endDate: string }): Promise<Candidate[]> {
  const prompt = `Suggest 3 distinct real travel destinations with valid three-letter IATA city codes usable for both flight and hotel search. Return only JSON. Group dates: ${dates.startDate} to ${dates.endDate}. Group preferences: ${JSON.stringify(members.map(m => ({ origin: m.origin, budget: m.budget, destinationType: m.destinationType, preferences: m.preferences, dealbreakers: m.dealbreakers, excludedDestinations: m.excludedDestinations })))}. Avoid every excluded destination and dealbreaker. No prices. Keep reason under 140 characters. Types must be one of beach, city, nature, adventure, culture.`;
  const response = await fetch('https://generativelanguage.googleapis.com/v1beta/models/gemini-3.5-flash-lite:generateContent', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'x-goog-api-key': required('GEMINI_API_KEY') },
    body: JSON.stringify({ contents: [{ parts: [{ text: prompt }] }], generationConfig: { responseMimeType: 'application/json', responseJsonSchema: { type: 'object', properties: { candidates: { type: 'array', items: { type: 'object', properties: { city: { type: 'string' }, country: { type: 'string' }, iata: { type: 'string' }, type: { type: 'string' }, reason: { type: 'string' } }, required: ['city', 'country', 'iata', 'type', 'reason'] } } }, required: ['candidates'] } } }),
    cache: 'no-store', signal: AbortSignal.timeout(20000),
  });
  if (!response.ok) throw new Error(`Gemini returned ${response.status}. Check model access or free-tier limits, then try again.`);
  const result = await response.json();
  const raw = result.candidates?.[0]?.content?.parts?.[0]?.text;
  if (!raw) throw new Error('Gemini returned no destinations. Try again.');
  const candidates = JSON.parse(raw).candidates as Candidate[];
  return candidates.filter(c => c.city && c.country && /^[A-Z]{3}$/.test(c.iata)).slice(0, 3);
}

async function search(params: Record<string, string>) {
  const url = new URL('https://serpapi.com/search.json');
  for (const [key, value] of Object.entries(params)) url.searchParams.set(key, value);
  url.searchParams.set('api_key', required('SERPAPI_API_KEY'));
  const response = await fetch(url, { cache: 'no-store', signal: AbortSignal.timeout(20000) });
  if (response.status === 401) throw new Error('SerpApi rejected the API key. Check SERPAPI_API_KEY in Vercel and redeploy.');
  if (response.status === 429) throw new Error('SerpApi free-plan search limit reached. Try again after the limit resets.');
  if (!response.ok) throw new Error(`SerpApi returned ${response.status}. Try again later.`);
  const data = await response.json();
  if (data.error) throw new Error(`SerpApi search failed: ${String(data.error).slice(0, 180)}`);
  return data;
}

type Flight = { price?: number };
type Hotel = { name?: string; total_rate?: { extracted_lowest?: number } };
const positive = (value: unknown): value is number => typeof value === 'number' && Number.isFinite(value) && value > 0;

export async function liveQuote(candidate: Candidate, members: MemberInput[], dates: { startDate: string; endDate: string }, currency: string): Promise<{ quote: Quote | null; error?: string }> {
  try {
    const origins = [...new Set(members.map(m => m.origin))];
    const [hotelResult, ...flightResults] = await Promise.all([
      search({ engine: 'google_hotels', q: `Hotels in ${candidate.city}, ${candidate.country}`, check_in_date: dates.startDate, check_out_date: dates.endDate, adults: String(members.length), currency }),
      ...origins.map(origin => origin === candidate.iata ? Promise.resolve(null) : search({ engine: 'google_flights', departure_id: origin, arrival_id: candidate.iata, outbound_date: dates.startDate, return_date: dates.endDate, type: '1', adults: '1', currency })
        .catch(error => { if (error instanceof Error && error.message.includes("hasn't returned any results")) return null; throw error; })),
    ]);
    const hotels = (hotelResult.properties || [] as Hotel[])
      .map((hotel: Hotel) => ({ name: hotel.name || 'Hotel', price: hotel.total_rate?.extracted_lowest }))
      .filter((hotel: { price: unknown }) => positive(hotel.price))
      .sort((a: { price: number }, b: { price: number }) => a.price - b.price);
    const flights = origins.map((origin, index) => {
      if (origin === candidate.iata) return [origin, 0] as const;
      const result = flightResults[index];
      const prices = [...(result?.best_flights || []), ...(result?.other_flights || [])].map((flight: Flight) => flight.price).filter(positive);
      return [origin, prices.length ? Math.min(...prices) : NaN] as const;
    });
    const unreachable = flights.filter(([, price]) => !Number.isFinite(price)).map(([origin]) => `${origin} (${members.filter(m => m.origin === origin).map(m => m.name).join(', ')})`);
    if (unreachable.length) return { quote: null, error: `${candidate.city}: no flights found from ${unreachable.join(' or ')}. Check the airport code.` };
    if (!hotels.length) return { quote: null, error: `${candidate.city}: no group hotel prices for these dates.` };
    const flightPrices = Object.fromEntries(members.map(m => [m.id, flights.find(([origin]) => origin === m.origin)![1]]));
    const flightLinks = Object.fromEntries(members.map(m => [m.id, `https://www.google.com/travel/flights?hl=en&q=${encodeURIComponent(`Flights from ${m.origin} to ${candidate.iata} ${dates.startDate} returning ${dates.endDate}`)}`]));
    return { quote: { flightPrices, hotelTotal: hotels[0].price, currency, quotedAt: new Date().toISOString(), hotelName: hotels[0].name, flightLinks, hotelLink: `https://www.google.com/travel/hotels?q=${encodeURIComponent(`${candidate.city}, ${candidate.country}`)}&checkin=${dates.startDate}&checkout=${dates.endDate}&adults=${members.length}` } };
  } catch (error) {
    const message = error instanceof Error ? error.message : 'SerpApi request failed.';
    if (message.includes('not configured')) throw error;
    return { quote: null, error: `${candidate.city}: ${message}` };
  }
}
