import { getActiveStaffSession } from '../_lib/admin.js';
import { allowedOrigin, json, supabaseRequest } from '../_lib/portal.js';

export default async function handler(request, response) {
  if (request.method !== 'GET') {
    response.setHeader('Allow', 'GET');
    return json(response, 405, { error: 'Método no permitido.' });
  }

  if (!allowedOrigin(request)) return json(response, 403, { error: 'Origen no autorizado.' });

  const active = await getActiveStaffSession(request);
  if (!active) return json(response, 401, { error: 'Sesión no válida.' });

  try {
    const [accountsResult, invitesResult, documentsResult, plansResult] = await Promise.all([
      supabaseRequest('megcredit_client_accounts?select=id,email,full_name,status,created_at&order=created_at.desc', { method: 'GET' }),
      supabaseRequest('megcredit_client_invites?used_at=is.null&select=id,email,full_name,expires_at,created_at&order=created_at.desc', { method: 'GET' }),
      supabaseRequest('megcredit_client_documents?select=id,client_account_id', { method: 'GET' }),
      supabaseRequest('megcredit_payment_plans?select=id,client_account_id,status,created_at&order=created_at.desc', { method: 'GET' }),
    ]);

    if (!accountsResult.ok) throw new Error(`Supabase clients query failed: ${accountsResult.status}`);
    const accounts = await accountsResult.json();
    const invites = invitesResult.ok ? await invitesResult.json() : [];
    const documents = documentsResult.ok ? await documentsResult.json() : [];
    const plans = plansResult.ok ? await plansResult.json() : [];

    const accountEmails = new Set(accounts.map((account) => account.email.toLowerCase()));
    const pendingInvites = invites
      .filter((invite) => new Date(invite.expires_at) > new Date() && !accountEmails.has(invite.email.toLowerCase()))
      .map((invite) => ({ ...invite, status: 'invited', isInvite: true, documentCount: 0, latestPlanStatus: null }));

    const clients = [...accounts.map((account) => ({
      ...account,
      documentCount: documents.filter((doc) => doc.client_account_id === account.id).length,
      latestPlanStatus: plans.find((plan) => plan.client_account_id === account.id)?.status || null,
    })), ...pendingInvites].sort((a, b) => new Date(b.created_at) - new Date(a.created_at));

    return json(response, 200, { clients });
  } catch (error) {
    console.error('Admin clients list failed', error instanceof Error ? error.message : 'unknown error');
    return json(response, 500, { error: 'No pudimos cargar los clientes.' });
  }
}
