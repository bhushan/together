import type { Candidate, MemberInput, Quote } from './domain';

function required(name: string) {
  const value = process.env[name];
  if (!value) throw new Error(`${name} is not configured.`);
  return value;
}

export async function suggestCandidates(members: MemberInput[], dates: { startDate: string; endDate: string }): Promise<Candidate[]> {
  const prompt = `Suggest 5 distinct real travel destinations with valid three-letter IATA city codes usable for both flight and hotel search. Return only JSON. Group dates: ${dates.startDate} to ${dates.endDate}. Group preferences: ${JSON.stringify(members.map(m => ({ origin: m.origin, budget: m.budget, destinationType: m.destinationType, preferences: m.preferences, dealbreakers: m.dealbreakers, excludedDestinations: m.excludedDestinations })))}. Avoid every excluded destination and dealbreaker. No prices. Keep reason under 140 characters. Types must be one of beach, city, nature, adventure, culture.`;
  const response = await fetch('https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'x-goog-api-key': required('GEMINI_API_KEY') },
    body: JSON.stringify({ contents: [{ parts: [{ text: prompt }] }], generationConfig: { responseMimeType: 'application/json', responseJsonSchema: { type: 'object', properties: { candidates: { type: 'array', items: { type: 'object', properties: { city: { type: 'string' }, country: { type: 'string' }, iata: { type: 'string' }, type: { type: 'string' }, reason: { type: 'string' } }, required: ['city', 'country', 'iata', 'type', 'reason'] } } }, required: ['candidates'] } } }),
    cache: 'no-store', signal: AbortSignal.timeout(20000),
  });
  if (!response.ok) throw new Error(`Gemini returned ${response.status}. Try a new round later.`);
  const result = await response.json();
  const raw = result.candidates?.[0]?.content?.parts?.[0]?.text;
  if (!raw) throw new Error('Gemini returned no destinations. Try again.');
  const candidates = JSON.parse(raw).candidates as Candidate[];
  return candidates.filter(c => c.city && c.country && /^[A-Z]{3}$/.test(c.iata)).slice(0, 6);
}

let accessToken: { value: string; expiresAt: number } | null = null;
let tokenRequest: Promise<string> | null = null;
async function amadeusToken() {
  if (accessToken && accessToken.expiresAt > Date.now() + 30000) return accessToken.value;
  if (!tokenRequest) tokenRequest = (async () => {
    const response = await fetch('https://api.amadeus.com/v1/security/oauth2/token', {
      method: 'POST', headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({ grant_type: 'client_credentials', client_id: required('AMADEUS_CLIENT_ID'), client_secret: required('AMADEUS_CLIENT_SECRET') }),
      cache: 'no-store', signal: AbortSignal.timeout(12000),
    });
    if (!response.ok) throw new Error(`Amadeus authentication returned ${response.status}. Check production access.`);
    const data = await response.json();
    accessToken = { value: data.access_token, expiresAt: Date.now() + Number(data.expires_in || 1500) * 1000 };
    return accessToken.value;
  })().finally(() => { tokenRequest = null; });
  return tokenRequest;
}

async function amadeus(path: string, params: Record<string, string>) {
  const url = new URL(`https://api.amadeus.com${path}`);
  for (const [key, value] of Object.entries(params)) url.searchParams.set(key, value);
  const response = await fetch(url, { headers: { Authorization: `Bearer ${await amadeusToken()}` }, cache: 'no-store', signal: AbortSignal.timeout(12000) });
  if (!response.ok) throw new Error(`Amadeus ${path} returned ${response.status}.`);
  return response.json();
}

export async function liveQuote(candidate: Candidate, members: MemberInput[], dates: { startDate: string; endDate: string }, currency: string): Promise<{ quote: Quote | null; error?: string }> {
  try {
    const roomQuantity = Math.ceil(members.length / 2);
    const hotelList = await amadeus('/v1/reference-data/locations/hotels/by-city', { cityCode: candidate.iata });
    const hotelIds = (hotelList.data || []).slice(0, 8).map((h: { hotelId: string }) => h.hotelId).filter(Boolean).join(',');
    if (!hotelIds) return { quote: null, error: `No hotel inventory for ${candidate.city}.` };
    const hotelRequest = amadeus('/v3/shopping/hotel-offers', { hotelIds, adults: String(members.length), roomQuantity: String(roomQuantity), checkInDate: dates.startDate, checkOutDate: dates.endDate, currency });
    const origins = [...new Set(members.map(m => m.origin))];
    const flightsRequest = Promise.all(origins.map(async origin => {
      if (origin === candidate.iata) return [origin, 0] as const;
      const result = await amadeus('/v2/shopping/flight-offers', { originLocationCode: origin, destinationLocationCode: candidate.iata, departureDate: dates.startDate, returnDate: dates.endDate, adults: '1', currencyCode: currency, max: '10' });
      const prices = (result.data || []).map((f: { price?: { grandTotal?: string; total?: string } }) => Number(f.price?.grandTotal || f.price?.total)).filter((n: number) => Number.isFinite(n) && n > 0);
      return [origin, prices.length ? Math.min(...prices) : NaN] as const;
    }));
    const [hotels, flights] = await Promise.all([hotelRequest, flightsRequest]);
    const hotelOffers = (hotels.data || []).flatMap((h: { hotel?: { name?: string }; offers?: { price?: { total?: string } }[] }) => (h.offers || []).map(o => ({ name: h.hotel?.name || 'Hotel', price: Number(o.price?.total) }))).filter((h: { price: number }) => Number.isFinite(h.price) && h.price > 0);
    hotelOffers.sort((a: { price: number }, b: { price: number }) => a.price - b.price);
    if (!hotelOffers.length || flights.some(([, price]) => !Number.isFinite(price))) return { quote: null, error: `No complete flight and hotel offers for ${candidate.city}.` };
    const flightPrices = Object.fromEntries(members.map(m => [m.id, flights.find(([origin]) => origin === m.origin)![1]]));
    const flightLinks = Object.fromEntries(members.map(m => [m.id, `https://www.google.com/travel/flights?hl=en&q=${encodeURIComponent(`Flights from ${m.origin} to ${candidate.iata} ${dates.startDate} returning ${dates.endDate}`)}`]));
    return { quote: { flightPrices, hotelTotal: hotelOffers[0].price, currency, quotedAt: new Date().toISOString(), hotelName: hotelOffers[0].name, flightLinks, hotelLink: `https://www.booking.com/searchresults.html?ss=${encodeURIComponent(`${candidate.city}, ${candidate.country}`)}&checkin=${dates.startDate}&checkout=${dates.endDate}&group_adults=${members.length}&no_rooms=${roomQuantity}` } };
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Amadeus request failed.';
    if (message.includes('not configured')) throw error;
    return { quote: null, error: `${candidate.city}: ${message}` };
  }
}
