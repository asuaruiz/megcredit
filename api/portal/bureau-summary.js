import { allowedOrigin, getActiveSession, json, supabaseOne, supabaseRequest } from '../_lib/portal.js';

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
    const report = await supabaseOne(
      `megcredit_client_bureau_reports?client_account_id=eq.${clientId}&parse_status=eq.confirmed&select=id,source,as_of_date&order=as_of_date.desc&limit=1`,
      { method: 'GET' },
    );

    if (!report) return json(response, 200, { report: null, scores: [], caseStatus: [] });

    const [scoresResult, caseStatusResult] = await Promise.all([
      supabaseRequest(`megcredit_client_bureau_scores?report_id=eq.${report.id}&select=bureau,score,score_date`, { method: 'GET' }),
      supabaseRequest(`megcredit_client_bureau_case_status?report_id=eq.${report.id}&select=bureau,status_category,count`, { method: 'GET' }),
    ]);
    const scores = scoresResult.ok ? await scoresResult.json() : [];
    const caseStatus = caseStatusResult.ok ? await caseStatusResult.json() : [];

    return json(response, 200, {
      report: { source: report.source, asOfDate: report.as_of_date },
      scores,
      caseStatus,
    });
  } catch (error) {
    console.error('Portal bureau summary failed', error instanceof Error ? error.message : 'unknown error');
    return json(response, 500, { error: 'No pudimos cargar tus datos de buró.' });
  }
}
