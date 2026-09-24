import { createHash, randomBytes } from 'node:crypto';

const base = () => {
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SECRET_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) throw new Error('Supabase is not configured.');
  return { url: `${url.replace(/\/$/, '')}/rest/v1`, key };
};

export const token = () => randomBytes(24).toString('base64url');
export const hash = (value: string) => createHash('sha256').update(value).digest('hex');

export async function db<T>(table: string, method = 'GET', query = '', body?: unknown): Promise<T> {
  const { url, key } = base();
  const response = await fetch(`${url}/${table}${query ? `?${query}` : ''}`, {
    method,
    headers: { apikey: key, ...(key.startsWith('sb_secret_') ? {} : { Authorization: `Bearer ${key}` }), 'Content-Type': 'application/json', Prefer: 'resolution=merge-duplicates,return=representation' },
    body: body === undefined ? undefined : JSON.stringify(body),
    cache: 'no-store',
  });
  if (!response.ok) {
    const detail = await response.text();
    throw new Error(`Database ${response.status}: ${detail.slice(0, 300)}`);
  }
  return response.json() as Promise<T>;
}

export async function one<T>(table: string, query: string): Promise<T | null> {
  const rows = await db<T[]>(table, 'GET', `${query}&limit=1`);
  return rows[0] ?? null;
}

export const eq = (field: string, value: string) => `${field}=eq.${encodeURIComponent(value)}`;
