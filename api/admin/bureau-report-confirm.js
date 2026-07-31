import { getActiveStaffSession } from '../_lib/admin.js';
import { allowedOrigin, isUuid, json, supabaseOne, supabaseRequest } from '../_lib/portal.js';

const BUREAUS = new Set(['equifax', 'experian', 'transunion']);
const STATUS_CATEGORIES = new Set([
  'unspecified',
  'positive',
  'deleted',
  'repaired',
  'updated',
  'in_dispute',
  'verified',
  'negative',
]);

function parseScores(input, fallbackDate) {
  if (!Array.isArray(input)) return [];
  const rows = [];
  for (const row of input) {
    if (!BUREAUS.has(row?.bureau)) throw new Error('Buró inválido en scores.');
    const score = Number(row.score);
    if (!Number.isInteger(score) || score < 300 || score > 850) throw new Error('Score inválido.');
    rows.push({ bureau: row.bureau, score, score_date: row.scoreDate || fallbackDate });
  }
  return rows;
}

function parseCaseStatus(input) {
  if (!Array.isArray(input)) return [];
  const rows = [];
  for (const row of input) {
    if (!BUREAUS.has(row?.bureau)) throw new Error('Buró inválido en case status.');
    if (!STATUS_CATEGORIES.has(row?.statusCategory)) throw new Error('Categoría de estado inválida.');
    const count = Number(row.count);
    if (!Number.isInteger(count) || count < 0) throw new Error('Conteo inválido.');
    rows.push({ bureau: row.bureau, status_category: row.statusCategory, count });
  }
  return rows;
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
  const reportId = body.reportId;
  if (!isUuid(reportId)) return json(response, 400, { error: 'Falta el id del reporte.' });

  try {
    const report = await supabaseOne(`megcredit_client_bureau_reports?id=eq.${reportId}&select=id,as_of_date`, { method: 'GET' });
    if (!report) return json(response, 404, { error: 'Reporte no encontrado.' });

    let scores;
    let caseStatus;
    try {
      scores = parseScores(body.scores, report.as_of_date);
      caseStatus = parseCaseStatus(body.caseStatus);
    } catch (validationError) {
      return json(response, 400, { error: validationError.message });
    }

    await Promise.all([
      ...scores.map((row) =>
        supabaseRequest('megcredit_client_bureau_scores?on_conflict=report_id,bureau', {
          method: 'POST',
          headers: { Prefer: 'resolution=merge-duplicates,return=minimal' },
          body: JSON.stringify({ report_id: reportId, ...row }),
        }),
      ),
      ...caseStatus.map((row) =>
        supabaseRequest('megcredit_client_bureau_case_status?on_conflict=report_id,bureau,status_category', {
          method: 'POST',
          headers: { Prefer: 'resolution=merge-duplicates,return=minimal' },
          body: JSON.stringify({ report_id: reportId, ...row }),
        }),
      ),
    ]);

    const patchResult = await supabaseRequest(`megcredit_client_bureau_reports?id=eq.${reportId}`, {
      method: 'PATCH',
      headers: { Prefer: 'return=minimal' },
      body: JSON.stringify({
        parse_status: 'confirmed',
        confirmed_by_staff_id: active.staff.id,
        confirmed_at: new Date().toISOString(),
      }),
    });
    if (!patchResult.ok) throw new Error(`Report confirm failed: ${patchResult.status}`);

    return json(response, 200, { ok: true });
  } catch (error) {
    console.error('Confirm bureau report failed', error instanceof Error ? error.message : 'unknown error');
    return json(response, 500, { error: 'No pudimos confirmar el reporte.' });
  }
}
