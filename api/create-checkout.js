// Vercel Serverless Function: POST /api/create-checkout
// Creates a Stripe Checkout session for Pro or Business plan
// SECURED: requires valid Supabase JWT, validates plan ID

import Stripe from 'stripe';
import { setCorsHeaders, verifyAuth } from './_auth.js';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);

const PLANS = {
  pro: {
    name: 'DocumentPull Pro',
    price: 4900,
    docs: '100 documents/month',
  },
  business: {
    name: 'DocumentPull Business',
    price: 14900,
    docs: '500 documents/month',
  },
};

export default async function handler(req, res) {
  // CORS
  if (setCorsHeaders(req, res)) return;

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  // AUTH — verify the user's JWT token
  const user = await verifyAuth(req, res);
  if (!user) return;

  try {
    const { planId } = req.body;

    // VALIDATE plan ID
    const plan = PLANS[planId];
    if (!plan) {
      return res.status(400).json({ error: 'Invalid plan. Use "pro" or "business".' });
    }

    const origin = req.headers.origin || 'https://documentpull.com';

    const session = await stripe.checkout.sessions.create({
      mode: 'subscription',
      payment_method_types: ['card'],
      customer_email: user.email, // use authenticated user's email, not user-supplied
      metadata: {
        userId: user.id, // use authenticated user's ID, not user-supplied
        planId,
      },
      line_items: [
        {
          price_data: {
            currency: 'usd',
            product_data: {
              name: plan.name,
              description: plan.docs,
            },
            recurring: { interval: 'month' },
            unit_amount: plan.price,
          },
          quantity: 1,
        },
      ],
      success_url: `${origin}?checkout=success`,
      cancel_url: `${origin}?checkout=cancel`,
    });

    return res.status(200).json({ url: session.url, sessionId: session.id });
  } catch (error) {
    console.error('Checkout error:', error);
    return res.status(500).json({ error: 'Failed to create checkout session' });
  }
}
