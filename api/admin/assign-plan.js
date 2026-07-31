import { randomUUID } from 'node:crypto';
import { getActiveStaffSession } from '../_lib/admin.js';
import { agreementReadyEmailHtml, allowedOrigin, clean, copyStorageObject, isUuid, json, sendPortalEmail, supabaseOne, supabaseRequest } from '../_lib/portal.js';

const BUCKET = process.env.SUPABASE_STORAGE_BUCKET || 'megcredit-client-documents';
const BILLING_TYPES = new Set(['one_time', 'recurring']);
const RECURRING_INTERVALS = new Set(['week', 'month', 'year']);

function validService(service) {
  const name = clean(service?.name, 160);
  const description = clean(service?.description, 1000);
  const priceCents = Number(service?.priceCents);
  const catalogId = service?.catalogId;
  if (name.length < 2 || !Number.isInteger(priceCents) || priceCents < 0) return null;
  return { name, description, priceCents, catalogId: isUuid(catalogId) ? catalogId : null };
}

export default async function handler(request, response) {
  if (request.method !== 'POST') {
    response.setHeader('Allow', 'POST');
    return json(response, 405, { error: 'Método no permitido.' });
  }

  if (!allowedOrigin(request)) return json(response, 403, { error: 'Origen no autorizado.' });

  const active = await getActiveStaffSession(request);
  if (!active) return json(response, 401, { error: 'Sesión no válida.' });

  const body = request.body || {};
  const clientId = body.clientId;
  const billingType = clean(body.billingType, 20);
  const recurringInterval = clean(body.recurringInterval, 20) || null;
  const agreementTitle = clean(body.agreementTitle, 200) || 'Acuerdo de servicios';
  const agreementText = clean(body.agreementText, 20000);
  const agreementPdfPath = clean(body.agreementPdfPath, 500);
  const agreementPdfFilename = clean(body.agreementPdfFilename, 255);
  const agreementPdfSizeBytes = Number(body.agreementPdfSizeBytes) || null;
  const contractTemplateId = body.contractTemplateId;
  const services = Array.isArray(body.services) ? body.services.map(validService) : [];
  const firstPaymentCentsRaw = body.firstPaymentCents;
  const hasFirstPayment = firstPaymentCentsRaw !== undefined && firstPaymentCentsRaw !== null && firstPaymentCentsRaw !== '';
  const firstPaymentCents = hasFirstPayment ? Number(firstPaymentCentsRaw) : null;
  const recurringAmountCents = billingType === 'recurring' ? Number(body.recurringAmountCents) : null;
  const totalAmountCents = services.reduce((sum, service) => sum + (service?.priceCents || 0), 0);

  if (!isUuid(clientId)) return json(response, 400, { error: 'Cliente inválido.' });
  if (!BILLING_TYPES.has(billingType)) return json(response, 400, { error: 'Tipo de facturación inválido.' });
  if (billingType === 'recurring' && !RECURRING_INTERVALS.has(recurringInterval)) {
    return json(response, 400, { error: 'Selecciona un intervalo de facturación recurrente.' });
  }
  if (services.some((service) => service === null) || services.length === 0) {
    return json(response, 400, { error: 'Revisa los servicios: cada uno necesita nombre y precio.' });
  }
  const hasUploadedPdf = Boolean(agreementPdfPath);
  const hasTemplate = isUuid(contractTemplateId);
  if (!hasUploadedPdf && !hasTemplate && agreementText.length < 10) {
    return json(response, 400, { error: 'Escribe el contrato, sube un PDF o elige una plantilla.' });
  }
  if (hasUploadedPdf && (!agreementPdfPath.startsWith(`${clientId}/contracts/`) || !agreementPdfFilename.toLowerCase().endsWith('.pdf'))) {
    return json(response, 400, { error: 'El PDF del contrato no es válido.' });
  }
  if (hasFirstPayment && (!Number.isInteger(firstPaymentCents) || firstPaymentCents < 0)) {
    return json(response, 400, { error: 'El primer pago no es válido.' });
  }
  if (billingType === 'one_time' && hasFirstPayment) {
    return json(response, 400, { error: 'El primer pago solo aplica a planes recurrentes.' });
  }
  if (billingType === 'recurring' && (!Number.isInteger(recurringAmountCents) || recurringAmountCents <= 0)) {
    return json(response, 400, { error: 'Ingresa el monto del pago recurrente.' });
  }
  if (billingType === 'recurring') {
    const initialAmount = hasFirstPayment && firstPaymentCents > 0 ? firstPaymentCents : recurringAmountCents;
    if (initialAmount > totalAmountCents || (totalAmountCents - initialAmount) % recurringAmountCents !== 0) {
      return json(response, 400, { error: 'El primer pago y las cuotas deben completar exactamente el valor total del plan.' });
    }
  }

  try {
    const client = await supabaseOne(
      `megcredit_client_accounts?id=eq.${clientId}&status=eq.active&select=id,email,full_name`,
      { method: 'GET' },
    );
    if (!client) return json(response, 404, { error: 'Cliente no encontrado o inactivo.' });

    const plan = await supabaseOne('megcredit_payment_plans', {
      method: 'POST',
      headers: { Prefer: 'return=representation' },
      body: JSON.stringify({
        client_account_id: clientId,
        created_by_staff_id: active.staff.id,
        billing_type: billingType,
        recurring_interval: billingType === 'recurring' ? recurringInterval : null,
        first_payment_cents: billingType === 'recurring' ? firstPaymentCents : null,
        recurring_amount_cents: billingType === 'recurring' ? recurringAmountCents : null,
        total_amount_cents: totalAmountCents,
        status: 'draft',
      }),
    });

    const serviceRows = services.map((service) => ({
      payment_plan_id: plan.id,
      client_account_id: clientId,
      service_catalog_id: service.catalogId,
      name: service.name,
      description: service.description,
      price_cents: service.priceCents,
    }));

    const servicesInsert = await supabaseRequest('megcredit_client_services', {
      method: 'POST',
      headers: { Prefer: 'return=minimal' },
      body: JSON.stringify(serviceRows),
    });
    if (!servicesInsert.ok) throw new Error(`Supabase services insert failed: ${servicesInsert.status}`);

    let finalPdfPath = hasUploadedPdf ? agreementPdfPath : null;
    let finalPdfFilename = hasUploadedPdf ? agreementPdfFilename : null;
    let finalPdfSizeBytes = hasUploadedPdf ? agreementPdfSizeBytes : null;

    if (hasTemplate) {
      const template = await supabaseOne(
        `megcredit_contract_templates?id=eq.${contractTemplateId}&select=storage_path,original_filename,size_bytes`,
        { method: 'GET' },
      );
      if (!template) return json(response, 404, { error: 'La plantilla de contrato seleccionada no existe.' });
      const destinationPath = `${clientId}/contracts/${randomUUID()}-${template.original_filename}`;
      await copyStorageObject(BUCKET, template.storage_path, destinationPath);
      finalPdfPath = destinationPath;
      finalPdfFilename = template.original_filename;
      finalPdfSizeBytes = template.size_bytes;
    }

    const hasPdf = Boolean(finalPdfPath);

    const agreementInsert = await supabaseRequest('megcredit_service_agreements', {
      method: 'POST',
      headers: { Prefer: 'return=minimal' },
      body: JSON.stringify({
        client_account_id: clientId,
        payment_plan_id: plan.id,
        title: agreementTitle,
        body_text: agreementText.length >= 10 ? agreementText : 'Contrato proporcionado como documento PDF adjunto.',
        ...(hasPdf ? { pdf_storage_path: finalPdfPath, pdf_original_filename: finalPdfFilename, pdf_size_bytes: finalPdfSizeBytes } : {}),
        created_by_staff_id: active.staff.id,
      }),
    });
    if (!agreementInsert.ok) throw new Error(`Supabase agreement insert failed: ${agreementInsert.status}`);

    try {
      const siteUrl = process.env.NODE_ENV === 'development' ? 'http://localhost:5173' : 'https://www.megcredit.com';
      await sendPortalEmail({
        to: client.email,
        subject: 'Your service agreement is ready to sign',
        html: agreementReadyEmailHtml({ fullName: client.full_name, loginUrl: `${siteUrl}/portal/dashboard` }),
      });
    } catch (emailError) {
      console.error('Assign plan email failed', emailError instanceof Error ? emailError.message : 'unknown error');
    }

    return json(response, 201, { ok: true, paymentPlanId: plan.id });
  } catch (error) {
    console.error('Assign plan failed', error instanceof Error ? error.message : 'unknown error');
    return json(response, 500, { error: 'No pudimos crear el plan de servicios.' });
  }
}
