import { createHmac } from 'node:crypto';

const MAX_BODY_BYTES = 16_000;
const MAX_SUBMISSIONS_PER_HOUR = 5;

function escapeHtml(value) {
  return String(value || '')
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#039;');
}

function emailLayout(content, previewText) {
  return `<!doctype html><html lang="es"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width"><title>${escapeHtml(previewText)}</title></head><body style="margin:0;background:#F1EDE4;font-family:Arial,sans-serif;color:#1A1A1A"><div style="display:none;max-height:0;overflow:hidden">${escapeHtml(previewText)}</div><table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background:#F1EDE4;padding:28px 12px"><tr><td align="center"><table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="max-width:620px;background:#FFFFFF;border-radius:8px;overflow:hidden;border:1px solid #E9E5DC"><tr><td style="background:#163A5F;padding:30px 36px"><div style="font-family:Georgia,serif;color:#D2AE5C;font-size:24px;font-weight:bold;letter-spacing:6px">MAGIC</div><div style="color:#F8F6F2;font-size:10px;font-weight:bold;letter-spacing:4px;margin-top:5px">ENTERPRISE GROUP</div></td></tr><tr><td style="padding:38px 36px">${content}</td></tr><tr><td style="background:#0E2740;padding:24px 36px;color:#BCC7D4;font-size:12px;line-height:1.7">Magic Enterprise Group · Orlando, Florida<br><a href="https://www.megcredit.com" style="color:#D2AE5C">megcredit.com</a> · <a href="tel:+14077358696" style="color:#D2AE5C">+1 407-735-8696</a><br><span style="color:#8FA0B4">Este mensaje se relaciona con una solicitud enviada en megcredit.com.</span></td></tr></table></td></tr></table></body></html>`;
}

function confirmationEmail(submission) {
  return emailLayout(`<p style="margin:0 0 8px;color:#A67C1B;font-size:12px;font-weight:bold;letter-spacing:2px;text-transform:uppercase">Solicitud recibida</p><h1 style="margin:0 0 18px;font-family:Georgia,serif;color:#163A5F;font-size:30px;line-height:1.2">Gracias, ${escapeHtml(submission.name)}.</h1><p style="margin:0 0 18px;color:#4A4A4A;font-size:16px;line-height:1.7">Recibimos tu solicitud de evaluación. Nuestro equipo revisará tus datos y se comunicará contigo para explicarte el siguiente paso.</p><div style="margin:24px 0;padding:18px 20px;border-left:3px solid #A67C1B;background:#F8F6F2;color:#4A4A4A;font-size:14px;line-height:1.6"><strong style="color:#163A5F">Importante:</strong> no respondas a este correo con reportes crediticios, contraseñas, información bancaria ni tu número completo de Seguro Social.</div><p style="margin:22px 0 0;color:#4A4A4A;font-size:14px">Si necesitas ayuda inmediata, puedes escribirnos por WhatsApp al <a href="https://wa.me/14077358696" style="color:#163A5F;font-weight:bold">+1 407-735-8696</a>.</p>`, 'Recibimos tu solicitud de evaluación');
}

function managerEmail(submission) {
  const row = (label, value) => `<tr><td style="padding:9px 12px;border-bottom:1px solid #E9E5DC;color:#7C5C14;font-size:12px;font-weight:bold;text-transform:uppercase;vertical-align:top;width:130px">${label}</td><td style="padding:9px 12px;border-bottom:1px solid #E9E5DC;color:#1A1A1A;font-size:14px;line-height:1.5">${escapeHtml(value || 'No indicado')}</td></tr>`;
  return emailLayout(`<p style="margin:0 0 8px;color:#A67C1B;font-size:12px;font-weight:bold;letter-spacing:2px;text-transform:uppercase">Nuevo contacto</p><h1 style="margin:0 0 20px;font-family:Georgia,serif;color:#163A5F;font-size:28px">Nueva solicitud desde megcredit.com</h1><table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="border:1px solid #E9E5DC;border-radius:6px;overflow:hidden">${row('Nombre', submission.name)}${row('Teléfono', submission.phone)}${row('Correo', submission.email)}${row('Meta', submission.goal)}${row('Mensaje', submission.message)}</table><p style="margin:24px 0 0"><a href="mailto:${encodeURIComponent(submission.email)}" style="display:inline-block;background:#163A5F;color:#FFFFFF;text-decoration:none;padding:12px 20px;border-radius:6px;font-size:14px;font-weight:bold">Responder al cliente</a></p>`, `Nueva solicitud de ${submission.name}`);
}

async function sendContactEmails(submission, submissionId) {
  const apiKey = process.env.RESEND_API_KEY;
  const from = process.env.CONTACT_FROM_EMAIL || 'MEG Credit <notificaciones@megcredit.com>';
  const manager = process.env.CONTACT_MANAGER_EMAIL || 'manager@megcredit.com';
  if (!apiKey) throw new Error('Missing RESEND_API_KEY');

  const result = await fetch('https://api.resend.com/emails/batch', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
      'Idempotency-Key': `megcredit-contact-${submissionId}`,
    },
    body: JSON.stringify([
      {
        from,
        to: [submission.email],
        reply_to: manager,
        subject: 'Recibimos tu solicitud de evaluación | MEG Credit',
        html: confirmationEmail(submission),
      },
      {
        from,
        to: [manager],
        reply_to: submission.email,
        subject: `Nueva solicitud de ${submission.name} | MEG Credit`,
        html: managerEmail(submission),
      },
    ]),
  });
  if (!result.ok) throw new Error(`Resend batch failed: ${result.status}`);
}

function json(response, status, body) {
  response.status(status).setHeader('Content-Type', 'application/json; charset=utf-8');
  response.setHeader('Cache-Control', 'no-store');
  return response.json(body);
}

function clean(value, maxLength) {
  return typeof value === 'string' ? value.trim().replace(/\0/g, '').slice(0, maxLength) : '';
}

function allowedOrigin(request) {
  const origin = request.headers.origin;
  if (!origin) return true;
  const allowed = new Set([
    'https://megcredit.com',
    'https://www.megcredit.com',
    process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : '',
    ...(process.env.NODE_ENV === 'development' ? ['http://localhost:5173', 'http://127.0.0.1:5173'] : []),
  ]);
  return allowed.has(origin);
}

function clientHash(request, secret) {
  const forwarded = request.headers['x-forwarded-for'];
  const ip = (Array.isArray(forwarded) ? forwarded[0] : forwarded || request.socket?.remoteAddress || 'unknown')
    .split(',')[0]
    .trim();
  return createHmac('sha256', secret).update(ip).digest('hex');
}

async function supabaseRequest(path, options, url, key) {
  return fetch(`${url}/rest/v1/${path}`, {
    ...options,
    headers: {
      apikey: key,
      Authorization: `Bearer ${key}`,
      'Content-Type': 'application/json',
      ...options.headers,
    },
  });
}

export default async function handler(request, response) {
  if (request.method !== 'POST') {
    response.setHeader('Allow', 'POST');
    return json(response, 405, { error: 'Método no permitido.' });
  }

  if (!allowedOrigin(request)) return json(response, 403, { error: 'Origen no autorizado.' });
  if (!request.headers['content-type']?.includes('application/json')) return json(response, 415, { error: 'Formato no permitido.' });
  if (Number(request.headers['content-length'] || 0) > MAX_BODY_BYTES) return json(response, 413, { error: 'Solicitud demasiado extensa.' });

  const supabaseUrl = process.env.SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!supabaseUrl || !serviceKey) {
    console.error('Missing server-side Supabase environment variables');
    return json(response, 503, { error: 'El formulario no está disponible temporalmente.' });
  }

  const body = request.body || {};
  if (body.website) return json(response, 200, { ok: true });

  const submission = {
    name: clean(body.name, 120),
    phone: clean(body.phone, 40),
    email: clean(body.email, 254).toLowerCase(),
    goal: clean(body.goal, 120),
    message: clean(body.message, 2_000),
    consent: body.consent === true,
    source: 'megcredit.com',
  };

  if (submission.name.length < 2 || !/^\S+@\S+\.\S+$/.test(submission.email) || submission.phone.length < 7 || !submission.consent) {
    return json(response, 400, { error: 'Revisa los campos obligatorios y vuelve a intentarlo.' });
  }

  const ipHash = clientHash(request, serviceKey);
  const since = new Date(Date.now() - 60 * 60 * 1000).toISOString();

  try {
    const countResult = await supabaseRequest(
      `megcredit_contact_submissions?ip_hash=eq.${ipHash}&created_at=gte.${encodeURIComponent(since)}&select=id`,
      { method: 'GET', headers: { Prefer: 'count=exact', Range: '0-4' } },
      supabaseUrl,
      serviceKey,
    );

    if (!countResult.ok) throw new Error(`Supabase rate check failed: ${countResult.status}`);
    const range = countResult.headers.get('content-range') || '';
    const count = Number(range.split('/')[1] || 0);
    if (count >= MAX_SUBMISSIONS_PER_HOUR) return json(response, 429, { error: 'Has enviado varias solicitudes. Intenta nuevamente más tarde.' });

    const insertResult = await supabaseRequest(
      'megcredit_contact_submissions',
      {
        method: 'POST',
        headers: { Prefer: 'return=representation' },
        body: JSON.stringify({
          ...submission,
          ip_hash: ipHash,
          user_agent: clean(request.headers['user-agent'], 500),
        }),
      },
      supabaseUrl,
      serviceKey,
    );

    if (!insertResult.ok) throw new Error(`Supabase insert failed: ${insertResult.status}`);
    const [saved] = await insertResult.json();

    try {
      await sendContactEmails(submission, saved.id);
      await supabaseRequest(
        `megcredit_contact_submissions?id=eq.${saved.id}`,
        {
          method: 'PATCH',
          headers: { Prefer: 'return=minimal' },
          body: JSON.stringify({
            email_status: 'sent',
            confirmation_sent_at: new Date().toISOString(),
            manager_notification_sent_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
          }),
        },
        supabaseUrl,
        serviceKey,
      );
    } catch (emailError) {
      console.error('Contact email delivery failed', emailError instanceof Error ? emailError.message : 'unknown error');
      await supabaseRequest(
        `megcredit_contact_submissions?id=eq.${saved.id}`,
        {
          method: 'PATCH',
          headers: { Prefer: 'return=minimal' },
          body: JSON.stringify({
            email_status: 'failed',
            email_error: clean(emailError instanceof Error ? emailError.message : 'unknown error', 500),
            updated_at: new Date().toISOString(),
          }),
        },
        supabaseUrl,
        serviceKey,
      );
    }

    return json(response, 201, { ok: true });
  } catch (error) {
    console.error('Contact submission failed', error instanceof Error ? error.message : 'unknown error');
    return json(response, 500, { error: 'No pudimos enviar tu solicitud. Intenta nuevamente o escríbenos por WhatsApp.' });
  }
}
