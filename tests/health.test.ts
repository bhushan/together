import test from 'node:test';
import assert from 'node:assert/strict';
import { GET } from '../src/app/api/health/route';

test('readiness never exposes keys and reports missing services', async () => {
  const old = { ...process.env };
  delete process.env.SUPABASE_URL;
  delete process.env.SUPABASE_SECRET_KEY;
  delete process.env.GEMINI_API_KEY;
  delete process.env.SERPAPI_API_KEY;
  try {
    const response = await GET();
    assert.equal(response.status, 503);
    const body = await response.json();
    assert.deepEqual(body, { status: 'setup_required', supabase: false, gemini: false, serpapi: false });
  } finally { process.env = old; }
});
