// Temporary debug endpoint — remove after debugging
export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');

  res.status(200).json({
    anthropicKeySet: !!process.env.ANTHROPIC_API_KEY,
    anthropicKeyPrefix: process.env.ANTHROPIC_API_KEY ? process.env.ANTHROPIC_API_KEY.substring(0, 10) + '...' : 'NOT SET',
    supabaseUrlSet: !!process.env.VITE_SUPABASE_URL,
    supabaseAnonKeySet: !!process.env.VITE_SUPABASE_ANON_KEY,
    supabaseServiceKeySet: !!process.env.SUPABASE_SERVICE_ROLE_KEY,
    stripeKeySet: !!process.env.STRIPE_SECRET_KEY,
    nodeVersion: process.version,
  });
}
