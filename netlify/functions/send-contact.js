// ============================================================
// SWIFT SPEED SENDER — NETLIFY FUNCTION: send-contact
// Handles contact form: saves to Supabase + sends email
// ============================================================

const { createClient } = require('@supabase/supabase-js');
const nodemailer = require('nodemailer');

exports.handler = async (event) => {
  // Only allow POST
  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, body: JSON.stringify({ error: 'Method not allowed' }) };
  }

  // CORS headers
  const headers = {
    'Content-Type': 'application/json',
    'Access-Control-Allow-Origin': process.env.SITE_URL || '*',
    'Access-Control-Allow-Methods': 'POST',
    'Access-Control-Allow-Headers': 'Content-Type'
  };

  let body;
  try {
    body = JSON.parse(event.body);
  } catch {
    return { statusCode: 400, headers, body: JSON.stringify({ error: 'Invalid JSON' }) };
  }

  const { name, email, phone, subject, message } = body;

  // ---- Validation ----
  const errors = {};
  if (!name || String(name).trim().length < 2)    errors.name    = 'Name is required (min 2 characters)';
  if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) errors.email = 'Valid email is required';
  if (!message || String(message).trim().length < 10) errors.message = 'Message is required (min 10 characters)';
  if (name    && String(name).length    > 200) errors.name    = 'Name too long';
  if (email   && String(email).length   > 320) errors.email   = 'Email too long';
  if (message && String(message).length > 5000) errors.message = 'Message too long (max 5000 characters)';

  if (Object.keys(errors).length > 0) {
    return { statusCode: 422, headers, body: JSON.stringify({ error: 'Validation failed', errors }) };
  }

  // ---- Save to Supabase ----
  let savedId = null;
  try {
    const supabase = createClient(
      process.env.SUPABASE_URL,
      process.env.SUPABASE_SERVICE_ROLE_KEY  // Service role — server only, never in frontend
    );

    const { data, error } = await supabase
      .from('contacts')
      .insert({
        name:       String(name).trim().slice(0, 200),
        email:      String(email).trim().toLowerCase().slice(0, 320),
        phone:      phone ? String(phone).trim().slice(0, 50) : null,
        subject:    subject ? String(subject).trim().slice(0, 300) : null,
        message:    String(message).trim().slice(0, 5000),
        ip_address: event.headers['x-forwarded-for']?.split(',')[0]?.trim() || null
      })
      .select('id')
      .single();

    if (error) {
      console.error('Supabase insert error:', error);
      // Don't fail — still try to send email
    } else {
      savedId = data?.id;
    }
  } catch (err) {
    console.error('Supabase connection error:', err);
  }

  // ---- Send Email ----
  try {
    if (process.env.SMTP_HOST && process.env.SMTP_USER && process.env.SMTP_PASS) {
      const transporter = nodemailer.createTransport({
        host: process.env.SMTP_HOST,
        port: parseInt(process.env.SMTP_PORT) || 587,
        secure: false,
        auth: {
          user: process.env.SMTP_USER,
          pass: process.env.SMTP_PASS
        },
        tls: { rejectUnauthorized: false }
      });

      await transporter.sendMail({
        from:    `"Swift Speed Sender" <${process.env.EMAIL_FROM}>`,
        to:      process.env.EMAIL_TO,
        subject: `New Contact: ${subject ? String(subject).trim() : 'No Subject'} — from ${String(name).trim()}`,
        html: `
          <div style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto">
            <div style="background:#0D1B2A;padding:24px;text-align:center">
              <h2 style="color:#C9A84C;margin:0;font-size:1.2rem">Swift Speed Sender</h2>
              <p style="color:rgba(250,247,240,0.5);font-size:0.75rem;margin:4px 0 0">New Contact Form Submission</p>
            </div>
            <div style="padding:24px;background:#fff;border:1px solid #eee">
              <table style="width:100%;border-collapse:collapse">
                <tr><td style="padding:8px 0;color:#6B7C8D;font-size:0.8rem;width:100px">Name</td>
                    <td style="padding:8px 0;font-weight:600">${escapeHtml(name)}</td></tr>
                <tr><td style="padding:8px 0;color:#6B7C8D;font-size:0.8rem">Email</td>
                    <td style="padding:8px 0"><a href="mailto:${escapeHtml(email)}">${escapeHtml(email)}</a></td></tr>
                ${phone ? `<tr><td style="padding:8px 0;color:#6B7C8D;font-size:0.8rem">Phone</td>
                    <td style="padding:8px 0">${escapeHtml(phone)}</td></tr>` : ''}
                ${subject ? `<tr><td style="padding:8px 0;color:#6B7C8D;font-size:0.8rem">Subject</td>
                    <td style="padding:8px 0">${escapeHtml(subject)}</td></tr>` : ''}
              </table>
              <hr style="border:none;border-top:1px solid #eee;margin:16px 0">
              <p style="color:#6B7C8D;font-size:0.8rem;margin-bottom:8px">Message:</p>
              <p style="background:#FAF7F0;padding:16px;border-radius:4px;white-space:pre-wrap">${escapeHtml(message)}</p>
            </div>
            <div style="padding:16px;text-align:center;color:#999;font-size:0.75rem">
              Reply directly to this email to respond to ${escapeHtml(name)}.
            </div>
          </div>
        `,
        replyTo: String(email).trim()
      });
    }
  } catch (emailErr) {
    // Email failure is not critical — data is saved in Supabase
    console.error('Email send error:', emailErr.message);
  }

  return {
    statusCode: 200,
    headers,
    body: JSON.stringify({
      success: true,
      message: 'Your message has been received. We will respond within 24 hours.',
      id: savedId
    })
  };
};

function escapeHtml(str) {
  return String(str || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}
