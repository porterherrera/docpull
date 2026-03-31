// Vercel Serverless Function: POST /api/extract
// Receives a base64-encoded document image, sends to Claude Vision, returns structured data

import Anthropic from '@anthropic-ai/sdk';
import { createClient } from '@supabase/supabase-js';

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

const supabase = createClient(
  process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_ANON_KEY
);

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
  // CORS headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { fileBase64, fileType, fileName, userId, documentId } = req.body;

    if (!fileBase64 || !userId) {
      return res.status(400).json({ error: 'Missing fileBase64 or userId' });
    }

    // Determine media type
    const mediaType = fileType || 'image/png';
    const supportedTypes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp', 'application/pdf'];

    // For PDFs, we'll convert the first page approach or handle differently
    const isImage = mediaType.startsWith('image/');

    // Build the Claude message
    const messageContent = [];

    if (mediaType === 'application/pdf') {
      messageContent.push({
        type: 'document',
        source: {
          type: 'base64',
          media_type: 'application/pdf',
          data: fileBase64,
        },
      });
    } else {
      messageContent.push({
        type: 'image',
        source: {
          type: 'base64',
          media_type: mediaType,
          data: fileBase64,
        },
      });
    }

    messageContent.push({
      type: 'text',
      text: EXTRACTION_PROMPT,
    });

    // Call Claude Vision
    const response = await anthropic.messages.create({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 4096,
      messages: [
        {
          role: 'user',
          content: messageContent,
        },
      ],
    });

    // Parse the response
    const responseText = response.content[0].text;

    // Try to parse JSON from the response
    let extractedData;
    try {
      // Handle case where Claude wraps JSON in markdown code blocks
      const jsonMatch = responseText.match(/```(?:json)?\s*([\s\S]*?)```/) || [null, responseText];
      extractedData = JSON.parse(jsonMatch[1].trim());
    } catch (parseError) {
      // If parsing fails, try to extract JSON object directly
      const jsonStart = responseText.indexOf('{');
      const jsonEnd = responseText.lastIndexOf('}');
      if (jsonStart !== -1 && jsonEnd !== -1) {
        extractedData = JSON.parse(responseText.substring(jsonStart, jsonEnd + 1));
      } else {
        throw new Error('Failed to parse extraction result');
      }
    }

    // Calculate a confidence score based on how many fields were extracted
    const fields = ['vendor', 'invoiceNumber', 'date', 'total', 'lineItems'];
    const filledFields = fields.filter((f) => {
      const val = extractedData[f];
      return val !== null && val !== undefined && val !== '' && (!Array.isArray(val) || val.length > 0);
    });
    const confidence = Math.round((filledFields.length / fields.length) * 100);

    // Update the document in Supabase if documentId provided
    if (documentId) {
      await supabase
        .from('documents')
        .update({
          status: 'completed',
          extracted_data: extractedData,
          confidence: confidence,
        })
        .eq('id', documentId);

      // Decrement demo_remaining or increment docs_used
      const { data: profile } = await supabase
        .from('profiles')
        .select('plan, demo_remaining, docs_used_this_month')
        .eq('id', userId)
        .single();

      if (profile) {
        if (profile.plan === 'demo' && profile.demo_remaining > 0) {
          await supabase
            .from('profiles')
            .update({ demo_remaining: profile.demo_remaining - 1 })
            .eq('id', userId);
        } else {
          await supabase
            .from('profiles')
            .update({ docs_used_this_month: (profile.docs_used_this_month || 0) + 1 })
            .eq('id', userId);
        }
      }
    }

    return res.status(200).json({
      success: true,
      data: extractedData,
      confidence,
      fileName,
    });
  } catch (error) {
    console.error('Extraction error:', error);
    return res.status(500).json({
      error: 'Extraction failed',
      message: error.message,
    });
  }
}
