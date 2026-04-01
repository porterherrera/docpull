// Vercel Serverless Function: POST /api/extract
// Receives a base64-encoded document image, sends to Claude Vision, returns structured data
// SECURED: requires valid Supabase JWT, enforces plan limits, validates input

import { setCorsHeaders, verifyAuth, getSupabaseAdmin } from './_auth.js';

const PLAN_LIMITS = { demo: 3, pro: 100, business: 500 };
const MAX_FILE_SIZE = 4 * 1024 * 1024; // 4MB base64 limit
const ALLOWED_TYPES = ['image/jpeg', 'image/png', 'image/gif', 'image/webp', 'application/pdf'];

const EXTRACTION_PROMPT = `You are an expert document data extraction AI. Analyze this invoice/receipt image and extract ALL data into a structured JSON format.

Return ONLY valid JSON with this exact structure (no markdown, no explanation):
{
  "vendor": "Company name",
  "invoiceNumber": "Invoice/receipt number",
  "date": "Date on document",
  "dueDate": "Due date if present, otherwise null",
  "subtotal": 0.00,
  "tax": 0.00,
  "total": 0.00,
  "currency": "USD",
  "paymentMethod": "Payment method if shown, otherwise null",
  "billTo": {
    "name": "Customer name if present",
    "address": "Customer address if present"
  },
  "lineItems": [
    {
      "description": "Item description",
      "quantity": 1,
      "unitPrice": 0.00,
      "amount": 0.00
    }
  ],
  "notes": "Any additional notes or terms"
}

Be precise with numbers. If a field is not present in the document, use null. Always return valid JSON.`;

export default async function handler(req, res) {
  // CORS
  if (setCorsHeaders(req, res)) return;

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  // AUTH — verify the user's JWT token
  const user = await verifyAuth(req, res);
  if (!user) return; // 401 already sent

  const supabase = user._supabaseClient || getSupabaseAdmin();

  try {
    const { fileBase64, fileType, fileName, documentId } = req.body;

    // INPUT VALIDATION
    if (!fileBase64) {
      return res.status(400).json({ error: 'Missing fileBase64' });
    }

    if (!fileName || typeof fileName !== 'string' || fileName.length > 255) {
      return res.status(400).json({ error: 'Invalid fileName' });
    }

    if (fileBase64.length > MAX_FILE_SIZE) {
      return res.status(400).json({ error: 'File too large. Maximum 4MB.' });
    }

    const mediaType = fileType || 'image/png';
    if (!ALLOWED_TYPES.includes(mediaType)) {
      return res.status(400).json({ error: 'Unsupported file type. Use JPEG, PNG, WebP, GIF, or PDF.' });
    }

    // PLAN LIMIT CHECK
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('plan, demo_remaining, docs_used_this_month')
      .eq('id', user.id)
      .single();

    if (profileError || !profile) {
      console.error('Profile lookup failed:', profileError?.message);
      return res.status(403).json({ error: 'Profile not found', details: profileError?.message });
    }

    console.log('Profile found:', JSON.stringify({ plan: profile.plan, demo_remaining: profile.demo_remaining }));

    const limit = PLAN_LIMITS[profile.plan] || 1;

    if (profile.plan === 'demo') {
      if (profile.demo_remaining <= 0) {
        return res.status(403).json({ error: 'Free extraction used. Please upgrade to continue.' });
      }
    } else {
      if ((profile.docs_used_this_month || 0) >= limit) {
        return res.status(403).json({ error: `Monthly limit of ${limit} documents reached.` });
      }
    }

    // Check API key
    if (!process.env.ANTHROPIC_API_KEY) {
      return res.status(500).json({ error: 'ANTHROPIC_API_KEY not configured on server' });
    }

    // Build message content for Claude
    const messageContent = [];

    if (mediaType === 'application/pdf') {
      // For PDFs, use the document type with beta header via raw fetch
      messageContent.push({
        type: 'document',
        source: { type: 'base64', media_type: 'application/pdf', data: fileBase64 },
      });
    } else {
      messageContent.push({
        type: 'image',
        source: { type: 'base64', media_type: mediaType, data: fileBase64 },
      });
    }

    messageContent.push({ type: 'text', text: EXTRACTION_PROMPT });

    // Call Claude API directly via fetch to avoid SDK version issues
    console.log('Calling Claude API via fetch. Media type:', mediaType);

    const headers = {
      'Content-Type': 'application/json',
      'x-api-key': process.env.ANTHROPIC_API_KEY,
      'anthropic-version': '2023-06-01',
    };

    // Add PDF beta header if needed
    if (mediaType === 'application/pdf') {
      headers['anthropic-beta'] = 'pdfs-2024-09-25';
    }

    const apiResponse = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers,
      body: JSON.stringify({
        model: 'claude-sonnet-4-20250514',
        max_tokens: 4096,
        messages: [{ role: 'user', content: messageContent }],
      }),
    });

    const apiResult = await apiResponse.json();

    if (!apiResponse.ok) {
      console.error('Claude API error:', JSON.stringify(apiResult));
      return res.status(500).json({
        error: 'Claude API call failed',
        message: apiResult.error?.message || 'Unknown API error',
        type: apiResult.error?.type,
        apiStatus: apiResponse.status,
      });
    }

    // Parse the response
    const responseText = apiResult.content[0].text;
    let extractedData;

    try {
      const jsonMatch = responseText.match(/```(?:json)?\s*([\s\S]*?)```/) || [null, responseText];
      extractedData = JSON.parse(jsonMatch[1].trim());
    } catch {
      const jsonStart = responseText.indexOf('{');
      const jsonEnd = responseText.lastIndexOf('}');
      if (jsonStart !== -1 && jsonEnd !== -1) {
        extractedData = JSON.parse(responseText.substring(jsonStart, jsonEnd + 1));
      } else {
        return res.status(500).json({ error: 'Failed to parse extraction result', raw: responseText.substring(0, 200) });
      }
    }

    // Confidence score
    const fields = ['vendor', 'invoiceNumber', 'date', 'total', 'lineItems'];
    const filledFields = fields.filter((f) => {
      const val = extractedData[f];
      return val !== null && val !== undefined && val !== '' && (!Array.isArray(val) || val.length > 0);
    });
    const confidence = Math.round((filledFields.length / fields.length) * 100);

    // Update document in Supabase
    if (documentId) {
      const { data: existingDoc } = await supabase
        .from('documents')
        .select('user_id')
        .eq('id', documentId)
        .single();

      if (existingDoc && existingDoc.user_id === user.id) {
        await supabase
          .from('documents')
          .update({ status: 'completed', extracted_data: extractedData, confidence })
          .eq('id', documentId)
          .eq('user_id', user.id);
      }
    }

    // Update usage
    if (profile.plan === 'demo') {
      await supabase
        .from('profiles')
        .update({ demo_remaining: Math.max(0, profile.demo_remaining - 1) })
        .eq('id', user.id);
    } else {
      await supabase
        .from('profiles')
        .update({ docs_used_this_month: (profile.docs_used_this_month || 0) + 1 })
        .eq('id', user.id);
    }

    // Send email notification (fire and forget — don't block the response)
    const origin = req.headers.origin || 'https://documentpull.com';
    fetch(`${origin}/api/notify`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: user.email,
        fileName,
        vendor: extractedData.vendor,
        total: extractedData.total,
        confidence,
      }),
    }).catch(() => {}); // Silently ignore notification errors

    return res.status(200).json({ success: true, data: extractedData, confidence, fileName });
  } catch (error) {
    console.error('Extraction error:', error.name, error.message);
    return res.status(500).json({
      error: 'Extraction failed',
      message: error.message,
      name: error.name,
    });
  }
}
