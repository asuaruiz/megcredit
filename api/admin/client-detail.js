import { getActiveStaffSession } from '../_lib/admin.js';
import { allowedOrigin, isUuid, json, supabaseOne, supabaseRequest } from '../_lib/portal.js';

export default async function handler(request, response) {
  if (request.method !== 'GET') {
    response.setHeader('Allow', 'GET');
    return json(response, 405, { error: 'Método no permitido.' });
  }

  if (!allowedOrigin(request)) return json(response, 403, { error: 'Origen no autorizado.' });

  const active = await getActiveStaffSession(request);
  if (!active) return json(response, 401, { error: 'Sesión no válida.' });

  const clientId = request.query?.id;
  if (!isUuid(clientId)) return json(response, 400, { error: 'Falta el id del cliente.' });

  try {
    const account = await supabaseOne(
      `megcredit_client_accounts?id=eq.${clientId}&select=id,email,full_name,phone,status,created_at,last_login_at`,
      { method: 'GET' },
    );
    if (!account) return json(response, 404, { error: 'Cliente no encontrado.' });

    const [documentsResult, plansResult, servicesResult, agreementsResult] = await Promise.all([
      supabaseRequest(`megcredit_client_documents?client_account_id=eq.${clientId}&select=id,document_type,status,original_filename,created_at&order=created_at.desc`, { method: 'GET' }),
      supabaseRequest(`megcredit_payment_plans?client_account_id=eq.${clientId}&select=*&order=created_at.desc`, { method: 'GET' }),
      supabaseRequest(`megcredit_client_services?client_account_id=eq.${clientId}&select=*`, { method: 'GET' }),
      supabaseRequest(`megcredit_service_agreements?client_account_id=eq.${clientId}&select=id,payment_plan_id,title,body_text,status,archived,signed_full_name,signed_at,signature_image_path,pdf_storage_path,pdf_original_filename,created_at`, { method: 'GET' }),
    ]);

    const documents = documentsResult.ok ? await documentsResult.json() : [];
    const plans = plansResult.ok ? await plansResult.json() : [];
    const services = servicesResult.ok ? await servicesResult.json() : [];
    const agreements = agreementsResult.ok ? await agreementsResult.json() : [];

    const safeAgreements = agreements.map(({ signature_image_path: signatureImagePath, pdf_storage_path: pdfPath, ...agreement }) => ({
      ...agreement,
      has_signature: Boolean(signatureImagePath),
      has_pdf: Boolean(pdfPath),
      plan_status: plans.find((plan) => plan.id === agreement.payment_plan_id)?.status || null,
    }));
    const enrichedPlans = plans.map((plan) => ({
      ...plan,
      services: services.filter((service) => service.payment_plan_id === plan.id),
      agreement: safeAgreements.find((agreement) => agreement.payment_plan_id === plan.id) || null,
    }));

    return json(response, 200, {
      account,
      documents,
      plans: enrichedPlans,
      signedAgreements: safeAgreements.filter((agreement) => agreement.status === 'signed'),
    });
  } catch (error) {
    console.error('Admin client detail failed', error instanceof Error ? error.message : 'unknown error');
    return json(response, 500, { error: 'No pudimos cargar el cliente.' });
  }
}
