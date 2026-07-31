import { allowedOrigin, getActiveSession, json, supabaseRequest } from '../_lib/portal.js';

export default async function handler(request, response) {
  if (request.method !== 'GET') {
    response.setHeader('Allow', 'GET');
    return json(response, 405, { error: 'Método no permitido.' });
  }

  if (!allowedOrigin(request)) return json(response, 403, { error: 'Origen no autorizado.' });

  const active = await getActiveSession(request);
  if (!active) return json(response, 401, { error: 'Sesión no válida.' });

  try {
    const clientId = active.account.id;
    const [plansResult, servicesResult, agreementsResult] = await Promise.all([
      supabaseRequest(`megcredit_payment_plans?client_account_id=eq.${clientId}&select=id,billing_type,recurring_interval,status,created_at&order=created_at.desc`, { method: 'GET' }),
      supabaseRequest(`megcredit_client_services?client_account_id=eq.${clientId}&select=id,payment_plan_id,name,description,price_cents`, { method: 'GET' }),
      supabaseRequest(`megcredit_service_agreements?client_account_id=eq.${clientId}&select=id,payment_plan_id,title,body_text,status,signed_full_name,signed_at,pdf_storage_path,pdf_original_filename`, { method: 'GET' }),
    ]);

    const plans = plansResult.ok ? await plansResult.json() : [];
    const services = servicesResult.ok ? await servicesResult.json() : [];
    const rawAgreements = agreementsResult.ok ? await agreementsResult.json() : [];
    const agreements = rawAgreements.map(({ pdf_storage_path: pdfPath, ...agreement }) => ({ ...agreement, has_pdf: Boolean(pdfPath) }));

    const enrichedPlans = plans.map((plan) => ({
      ...plan,
      services: services.filter((service) => service.payment_plan_id === plan.id),
      agreement: agreements.find((agreement) => agreement.payment_plan_id === plan.id) || null,
    }));

    return json(response, 200, { plans: enrichedPlans });
  } catch (error) {
    console.error('Portal services failed', error instanceof Error ? error.message : 'unknown error');
    return json(response, 500, { error: 'No pudimos cargar tus servicios.' });
  }
}
