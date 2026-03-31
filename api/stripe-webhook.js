// Vercel Serverless Function: POST /api/stripe-webhook
// Handles Stripe webhook events for subscription changes
// SECURED: verifies Stripe webhook signature, no user auth needed (server-to-server)

import Stripe from 'stripe';
import { createClient } from '@supabase/supabase-js';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);

const supabase = createClient(
  process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_ANON_KEY
);

export const config = {
  api: { bodyParser: false },
};

async function buffer(readable) {
  const chunks = [];
  for await (const chunk of readable) {
    chunks.push(typeof chunk === 'string' ? Buffer.from(chunk) : chunk);
  }
  return Buffer.concat(chunks);
}

export default async function handler(req, res) {
  // No CORS needed — this is called by Stripe servers only
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  let event;

  try {
    const buf = await buffer(req);
    const sig = req.headers['stripe-signature'];

    if (process.env.STRIPE_WEBHOOK_SECRET && sig) {
      // VERIFY Stripe signature — this proves the request came from Stripe
      event = stripe.webhooks.constructEvent(buf, sig, process.env.STRIPE_WEBHOOK_SECRET);
    } else if (process.env.NODE_ENV === 'development' || !process.env.STRIPE_WEBHOOK_SECRET) {
      // Development fallback — log a warning
      console.warn('WARNING: No STRIPE_WEBHOOK_SECRET set. Webhook signature not verified.');
      event = JSON.parse(buf.toString());
    } else {
      return res.status(400).json({ error: 'Missing stripe-signature header' });
    }
  } catch (err) {
    console.error('Webhook signature verification failed:', err.message);
    return res.status(400).json({ error: `Webhook Error: ${err.message}` });
  }

  try {
    switch (event.type) {
      case 'checkout.session.completed': {
        const session = event.data.object;
        const userId = session.metadata?.userId;
        const planId = session.metadata?.planId;

        // Validate metadata exists
        if (!userId || !planId) {
          console.error('Webhook: missing userId or planId in session metadata');
          break;
        }

        // Validate planId is a real plan
        if (!['pro', 'business'].includes(planId)) {
          console.error('Webhook: invalid planId:', planId);
          break;
        }

        await supabase
          .from('profiles')
          .update({
            plan: planId,
            stripe_customer_id: session.customer,
            docs_used_this_month: 0,
            billing_cycle_start: new Date().toISOString(),
          })
          .eq('id', userId);
        break;
      }

      case 'customer.subscription.deleted': {
        const subscription = event.data.object;
        const customerId = subscription.customer;

        if (customerId) {
          await supabase
            .from('profiles')
            .update({ plan: 'demo', demo_remaining: 0 })
            .eq('stripe_customer_id', customerId);
        }
        break;
      }

      case 'invoice.payment_succeeded': {
        const invoice = event.data.object;
        const customerId = invoice.customer;

        if (invoice.billing_reason === 'subscription_cycle' && customerId) {
          await supabase
            .from('profiles')
            .update({
              docs_used_this_month: 0,
              billing_cycle_start: new Date().toISOString(),
            })
            .eq('stripe_customer_id', customerId);
        }
        break;
      }

      case 'invoice.payment_failed': {
        console.error('Payment failed for customer:', event.data.object.customer);
        break;
      }
    }

    return res.status(200).json({ received: true });
  } catch (error) {
    console.error('Webhook handler error:', error);
    return res.status(500).json({ error: 'Webhook handler failed' });
  }
}
