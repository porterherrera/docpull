// Shared auth helper for API routes
// Verifies the Supabase JWT token from the Authorization header

import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_ANON_KEY
);

const ALLOWED_ORIGINS = [
  'https://docpull-psi.vercel.app',
  'https://docpull.vercel.app',
  'http://localhost:5173', // local dev
  'http://localhost:3000',
];

/**
 * Sets secure CORS headers. Returns true if it's a preflight OPTIONS request (already handled).
 */
export function setCorsHeaders(req, res) {
  const origin = req.headers.origin;
  if (ALLOWED_ORIGINS.includes(origin)) {
    res.setHeader('Access-Control-Allow-Origin', origin);
  }
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  res.setHeader('Access-Control-Max-Age', '86400');

  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return true;
  }
  return false;
}

/**
 * Verifies the user's Supabase JWT token.
 * Returns the user object if valid, or sends a 401 and returns null.
 */
export async function verifyAuth(req, res) {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    res.status(401).json({ error: 'Missing or invalid authorization header' });
    return null;
  }

  const token = authHeader.replace('Bearer ', '');

  try {
    const { data: { user }, error } = await supabase.auth.getUser(token);

    if (error || !user) {
      res.status(401).json({ error: 'Invalid or expired token' });
      return null;
    }

    return user;
  } catch (err) {
    res.status(401).json({ error: 'Authentication failed' });
    return null;
  }
}

/**
 * Gets the Supabase admin client (for server-side operations)
 */
export function getSupabaseAdmin() {
  return supabase;
}
