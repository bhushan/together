import { NextResponse } from 'next/server';

export async function GET() {
  const supabase = !!process.env.SUPABASE_URL && !!(process.env.SUPABASE_SECRET_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY);
  const gemini = !!process.env.GEMINI_API_KEY;
  const amadeus = !!process.env.AMADEUS_CLIENT_ID && !!process.env.AMADEUS_CLIENT_SECRET;
  const ready = supabase && gemini && amadeus;
  return NextResponse.json({ status: ready ? 'configured' : 'setup_required', supabase, gemini, amadeus }, { status: ready ? 200 : 503 });
}
