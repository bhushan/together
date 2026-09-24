import { NextResponse } from 'next/server';

export async function GET() {
  const supabase = !!process.env.SUPABASE_URL && !!(process.env.SUPABASE_SECRET_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY);
  const gemini = !!process.env.GEMINI_API_KEY;
  const serpapi = !!process.env.SERPAPI_API_KEY;
  const ready = supabase && gemini && serpapi;
  return NextResponse.json({ status: ready ? 'configured' : 'setup_required', supabase, gemini, serpapi }, { status: ready ? 200 : 503 });
}
