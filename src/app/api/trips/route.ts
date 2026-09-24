import { NextResponse } from 'next/server';
import { db, hash, token } from '@/lib/store';

export async function POST(request: Request) {
  try {
    const input = await request.json();
    const title = String(input.title || '').trim().slice(0, 80);
    const name = String(input.name || '').trim().slice(0, 50);
    const currency = String(input.currency || '').toUpperCase();
    if (!title || !name || !/^[A-Z]{3}$/.test(currency)) return NextResponse.json({ error: 'Enter a trip name, your name, and a three-letter currency.' }, { status: 400 });
    const slug = token().slice(0, 16);
    const organizerToken = token();
    const [trip] = await db<{ id: string }[]>('trips', 'POST', '', { slug, title, currency, organizer_token_hash: hash(organizerToken) });
    await db('members', 'POST', '', { trip_id: trip.id, name, token_hash: hash(organizerToken) });
    return NextResponse.json({ slug, token: organizerToken });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error && error.message.includes('not configured') ? error.message : 'Could not create the trip. Please try again.' }, { status: 503 });
  }
}
