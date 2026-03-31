// Vercel Serverless Function: POST /api/create-checkout
// Creates a Stripe Checkout session for Pro or Business plan

import Stripe from 'stripe';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);

const PLANS = {
  pro: {
    name: 'DocPull Pro',
    price: 4900, // $49.00 in cents
    docs: '100 documents/month',
  },
  business: {
    name: 'DocPull Business',
    price: 14900, // $149.00 in cents
    docs: '500 documents/month',
  },
};

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  try {
    const { planId, userId, userEmail, successUrl, cancelUrl } = req.body;

    const plan = PLANS[planId];
    if (!plan) {
      return res.status(400).json({ error: 'Invalid plan. Use "pro" or "business".' });
    }

    const origin = req.headers.origin || req.headers.referer || 'https://docpull-psi.vercel.app';

    const session = await stripe.checkout.sessions.create({
      mode: 'subscription',
      payment_method_types: ['card'],
      customer_email: userEmail,
      metadata: {
        userId,
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
      success_url: successUrl || `${origin}?checkout=success`,
      cancel_url: cancelUrl || `${origin}?checkout=cancel`,
    });

    return res.status(200).json({ url: session.url, sessionId: session.id });
  } catch (error) {
    console.error('Checkout error:', error);
    return res.status(500).json({ error: error.message });
  }
}
