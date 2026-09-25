export type MemberInput = {
  id: string; name: string; origin: string; startDate: string; endDate: string;
  budget: number; destinationType: string; excludedDestinations: string[];
  preferences: string; dealbreakers: string;
};
export type Candidate = { city: string; country: string; iata: string; type: string; reason: string };
export type Quote = { flightPrices: Record<string, number>; hotelTotal: number; currency: string; quotedAt: string; hotelName: string; flightLinks: Record<string, string>; hotelLink: string };

export function validateSubmission(input: MemberInput): { ok: boolean; error?: string } {
  if (!/^[A-Z]{3}$/.test(input.origin)) return { ok: false, error: 'Enter a three-letter airport code, such as DEL.' };
  const realDate = (value: string) => /^\d{4}-\d{2}-\d{2}$/.test(value) && !Number.isNaN(Date.parse(`${value}T00:00:00Z`)) && new Date(`${value}T00:00:00Z`).toISOString().slice(0, 10) === value;
  if (!realDate(input.startDate) || !realDate(input.endDate) || input.startDate > input.endDate) return { ok: false, error: 'Choose a valid date range.' };
  if (!Number.isFinite(input.budget) || input.budget <= 0) return { ok: false, error: 'Enter a budget greater than zero.' };
  if (!input.name.trim()) return { ok: false, error: 'Enter your name.' };
  return { ok: true };
}

export function overlapDates(members: MemberInput[]) {
  if (!members.length) return null;
  const startDate = members.map(m => m.startDate).sort().at(-1)!;
  const endDate = members.map(m => m.endDate).sort()[0];
  return startDate <= endDate ? { startDate, endDate } : null;
}

export function assessCandidate(candidate: Candidate, members: MemberInput[], quote: Quote | null) {
  const issues: string[] = [];
  if (!quote || !Number.isFinite(quote.hotelTotal) || quote.hotelTotal <= 0) issues.push('Live flight or hotel price unavailable.');
  const city = candidate.city.toLowerCase();
  const country = candidate.country.toLowerCase();
  const positions = members.map(member => {
    const blocked = member.excludedDestinations.some(x => {
      const term = x.trim().toLowerCase();
      return !!term && (city === term || country === term || city.includes(term) || country.includes(term));
    });
    const cost = quote ? (quote.flightPrices[member.id] ?? Infinity) + quote.hotelTotal / members.length : Infinity;
    if (blocked) issues.push(`${member.name} excluded ${candidate.city} or ${candidate.country}.`);
    if (!Number.isFinite(cost)) issues.push(`No live flight price for ${member.name}.`);
    if (Number.isFinite(cost) && cost > member.budget) issues.push(`${member.name}'s estimated cost exceeds their budget.`);
    const typeMatch = member.destinationType === 'any' || member.destinationType.toLowerCase() === candidate.type.toLowerCase();
    const score = blocked || !Number.isFinite(cost) || cost > member.budget ? 0 : typeMatch ? 100 : 65;
    return { memberId: member.id, name: member.name, cost: Number.isFinite(cost) ? Math.round(cost) : null, budget: member.budget, score, position: blocked ? 'Excluded destination' : !Number.isFinite(cost) ? 'Price unavailable' : cost > member.budget ? 'Over budget' : typeMatch ? 'Preferred style' : 'Different style' };
  });
  const score = Math.round(positions.reduce((sum, x) => sum + x.score, 0) / positions.length);
  const totalCost = quote ? Object.values(quote.flightPrices).reduce((a, b) => a + b, 0) + quote.hotelTotal : Infinity;
  return { feasible: issues.length === 0, issues: [...new Set(issues)], positions, score, totalCost };
}

export function rankOptions<T extends { score: number; totalCost: number }>(options: T[]): T[] {
  return [...options].sort((a, b) => b.score - a.score || a.totalCost - b.totalCost);
}
