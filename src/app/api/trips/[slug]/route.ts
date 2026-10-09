import { NextResponse } from 'next/server';
import { db, eq, hash, one, token } from '@/lib/store';
import { assessCandidate, overlapDates, rankOptions, validateSubmission, type MemberInput } from '@/lib/domain';
import { liveQuote, suggestCandidates } from '@/lib/providers';

export const maxDuration = 60;
type Params = { params: Promise<{ slug: string }> };
type Trip = { id: string; slug: string; title: string; currency: string; organizer_token_hash: string };
type Member = { id: string; trip_id: string; name: string; token_hash: string; origin: string | null; start_date: string | null; end_date: string | null; budget: number | null; destination_type: string | null; excluded_destinations: string[]; preferences: string; dealbreakers: string; submitted_at: string | null; created_at: string };
type Round = { id: string; status: string; issues: string[]; created_at: string; locked_option_id: string | null };
type Option = { id: string; round_id: string; city: string; country: string; iata: string; destination_type: string; reason: string; score: number; total_cost: number; quote: unknown; positions: unknown };
type Vote = { member_id: string; option_id: string };

async function tripFor(slug: string) { return one<Trip>('trips', `${eq('slug', slug)}&select=*`); }
async function membersFor(tripId: string) { return db<Member[]>('members', 'GET', `${eq('trip_id', tripId)}&select=*&order=created_at.asc`); }
function memberInput(member: Member): MemberInput { return { id: member.id, name: member.name, origin: member.origin!, startDate: member.start_date!, endDate: member.end_date!, budget: Number(member.budget), destinationType: member.destination_type!, excludedDestinations: member.excluded_destinations || [], preferences: member.preferences, dealbreakers: member.dealbreakers }; }
const reply = (error: string, status = 400) => NextResponse.json({ error }, { status });

export async function GET(request: Request, context: Params) {
  try {
    const { slug } = await context.params;
    const trip = await tripFor(slug);
    if (!trip) return reply('Trip not found.', 404);
    const secret = request.headers.get('x-member-token') || '';
    const members = await membersFor(trip.id);
    const self = secret ? members.find(m => m.token_hash === hash(secret)) : undefined;
    const organizer = !!secret && trip.organizer_token_hash === hash(secret);
    const rounds = await db<Round[]>('rounds', 'GET', `${eq('trip_id', trip.id)}&select=*&order=created_at.desc`);
    const latest = rounds[0] || null;
    const options = latest ? await db<Option[]>('options', 'GET', `${eq('round_id', latest.id)}&select=*&order=score.desc,total_cost.asc`) : [];
    const votes = latest ? await db<Vote[]>('votes', 'GET', `${eq('round_id', latest.id)}&select=member_id,option_id`) : [];
    const tally = Object.fromEntries(options.map(option => [option.id, votes.filter(v => v.option_id === option.id).length]));
    const stale = !!latest && members.some(m => !m.submitted_at || m.submitted_at > latest.created_at || m.created_at > latest.created_at);
    const previousRounds = await Promise.all(rounds.slice(1, 11).map(async r => {
      const chosen = r.locked_option_id ? await one<Option>('options', `${eq('id', r.locked_option_id)}&select=*`) : null;
      return { id: r.id, status: r.status, createdAt: r.created_at, lockedChoice: chosen?.city || null };
    }));
    return NextResponse.json({ title: trip.title, currency: trip.currency, organizer, self: self ? { id: self.id, name: self.name, origin: self.origin, startDate: self.start_date, endDate: self.end_date, budget: self.budget, destinationType: self.destination_type, excludedDestinations: self.excluded_destinations, preferences: self.preferences, dealbreakers: self.dealbreakers, submitted: !!self.submitted_at } : null, members: members.map(m => ({ name: m.name, submitted: !!m.submitted_at })), round: latest ? { ...latest, stale, options, tally, myVote: votes.find(v => v.member_id === self?.id)?.option_id || null } : null, previousRounds });
  } catch { return reply('Could not load the trip. Check the database connection.', 503); }
}

export async function POST(request: Request, context: Params) {
  try {
    const { slug } = await context.params;
    const trip = await tripFor(slug);
    if (!trip) return reply('Trip not found.', 404);
    const body = await request.json();
    const action = String(body.action || '');
    const secret = request.headers.get('x-member-token') || '';
    const secretHash = secret ? hash(secret) : '';
    const members = await membersFor(trip.id);
    const self = members.find(m => m.token_hash === secretHash);
    const organizer = !!secret && trip.organizer_token_hash === secretHash;

    if (action === 'join') {
      const name = String(body.name || '').trim().slice(0, 50);
      if (!name) return reply('Enter your name.');
      if (members.some(m => m.name.toLowerCase() === name.toLowerCase())) return reply('That name is already in this group. Use a distinct name or your private edit link.');
      const memberToken = token();
      await db('members', 'POST', '', { trip_id: trip.id, name, token_hash: hash(memberToken) });
      return NextResponse.json({ token: memberToken });
    }

    if (!self) return reply('Open your private member link to continue.', 403);
    if (action === 'submit') {
      const input: MemberInput = { id: self.id, name: self.name, origin: String(body.origin || '').trim().toUpperCase(), startDate: String(body.startDate || ''), endDate: String(body.endDate || ''), budget: Number(body.budget), destinationType: String(body.destinationType || 'any'), excludedDestinations: String(body.excludedDestinations || '').split(',').map(x => x.trim()).filter(Boolean).slice(0, 20), preferences: String(body.preferences || '').slice(0, 1000), dealbreakers: String(body.dealbreakers || '').slice(0, 1000) };
      const validation = validateSubmission(input);
      if (!validation.ok) return reply(validation.error!);
      await db('members', 'PATCH', eq('id', self.id), { origin: input.origin, start_date: input.startDate, end_date: input.endDate, budget: input.budget, destination_type: input.destinationType, excluded_destinations: input.excludedDestinations, preferences: input.preferences, dealbreakers: input.dealbreakers, submitted_at: new Date().toISOString() });
      return NextResponse.json({ ok: true });
    }

    const rounds = await db<Round[]>('rounds', 'GET', `${eq('trip_id', trip.id)}&select=*&order=created_at.desc&limit=1`);
    const latest = rounds[0];
    if (action === 'generate') {
      if (!organizer) return reply('Only the organiser can start a recommendation round.', 403);
      if (members.length < 2 || members.some(m => !m.submitted_at)) return reply('At least two people must join, and everyone must submit preferences.');
      const inputs = members.map(memberInput);
      const dates = overlapDates(inputs);
      if (!dates || dates.startDate === dates.endDate) {
        await db('rounds', 'POST', '', { trip_id: trip.id, status: 'conflict', issues: ['The group has no shared date range with at least one night. Edit dates and try a new round.'] });
        return NextResponse.json({ ok: true });
      }
      const candidates = await suggestCandidates(inputs, dates);
      const assessed = [];
      for (let index = 0; index < candidates.length; index += 2) {
        const batch = await Promise.all(candidates.slice(index, index + 2).map(async candidate => {
          const { quote, error } = await liveQuote(candidate, inputs, dates, trip.currency);
          const result = assessCandidate(candidate, inputs, quote);
          return { candidate, quote, ...result, issues: error ? [error] : result.issues };
        }));
        assessed.push(...batch);
      }
      const feasible = rankOptions(assessed.filter(x => x.feasible)).slice(0, 3);
      const issues = feasible.length ? [] : [...new Set(assessed.flatMap(x => x.issues))].slice(0, 8);
      const [round] = await db<Round[]>('rounds', 'POST', '', { trip_id: trip.id, status: feasible.length ? 'ready' : 'conflict', issues: issues.length ? issues : ['No candidate passed all live price and group checks. Try a new round or loosen a constraint.'] });
      if (feasible.length) await db('options', 'POST', '', feasible.map(x => ({ round_id: round.id, city: x.candidate.city, country: x.candidate.country, iata: x.candidate.iata, destination_type: x.candidate.type, reason: x.candidate.reason, score: x.score, total_cost: x.totalCost, quote: x.quote, positions: x.positions })));
      return NextResponse.json({ ok: true });
    }

    if (!latest || latest.status !== 'ready') return reply('There is no open recommendation round.');
    if (members.some(m => !m.submitted_at || m.submitted_at > latest.created_at || m.created_at > latest.created_at)) return reply('Preferences changed since this round. Start a new round before voting or locking.');
    if (action === 'vote') {
      const optionId = String(body.optionId || '');
      const option = await one<Option>('options', `${eq('id', optionId)}&${eq('round_id', latest.id)}&select=*`);
      if (!option) return reply('Choose an option from the current round.');
      await db('votes', 'POST', 'on_conflict=round_id,member_id', { round_id: latest.id, member_id: self.id, option_id: optionId });
      return NextResponse.json({ ok: true });
    }
    if (action === 'lock') {
      if (!organizer) return reply('Only the organiser can lock the result.', 403);
      const optionId = String(body.optionId || '');
      const option = await one<Option>('options', `${eq('id', optionId)}&${eq('round_id', latest.id)}&select=*`);
      if (!option) return reply('Choose an option from the current round.');
      await db('rounds', 'PATCH', eq('id', latest.id), { status: 'locked', locked_option_id: optionId });
      return NextResponse.json({ ok: true });
    }
    return reply('Unknown action.');
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unexpected error';
    const safe = message.includes('not configured') || message.startsWith('Gemini') || message.startsWith('SerpApi') ? message : 'Request failed. Please try again.';
    return reply(safe, 503);
  }
}
