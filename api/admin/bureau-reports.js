import { randomUUID } from 'node:crypto';
import { getActiveStaffSession } from '../_lib/admin.js';
import { allowedOrigin, clean, isUuid, json, supabaseOne, supabaseRequest } from '../_lib/portal.js';

const BUCKET = 'megcredit-bureau-reports';

function sanitizeFilename(name) {
  const trimmed = clean(name, 150) || 'reporte.pdf';
  return trimmed.replace(/[^a-zA-Z0-9._-]/g, '_');
}

async function createSignedUploadUrl(path) {
  const supabaseUrl = process.env.SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  const result = await fetch(`${supabaseUrl}/storage/v1/object/upload/sign/${BUCKET}/${path}`, {
    method: 'POST',
    headers: {
      apikey: serviceKey,
      Authorization: `Bearer ${serviceKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({}),
  });
  if (!result.ok) throw new Error(`Storage sign failed: ${result.status} ${await result.text()}`);
  const data = await result.json();
  const signedUrl = new URL(`${supabaseUrl}/storage/v1${data.url}`);
  const token = signedUrl.searchParams.get('token');
  if (!token) throw new Error('Storage sign response missing token');
  return { signedUrl: signedUrl.toString(), token };
}

async function listReports(clientAccountId) {
  const reportsResult = await supabaseRequest(
    `megcredit_client_bureau_reports?client_account_id=eq.${clientAccountId}&select=*&order=created_at.desc`,
    { method: 'GET' },
  );
  const reports = reportsResult.ok ? await reportsResult.json() : [];
  if (reports.length === 0) return [];

  const reportIds = reports.map((report) => report.id).join(',');
  const [scoresResult, caseStatusResult] = await Promise.all([
    supabaseRequest(`megcredit_client_bureau_scores?report_id=in.(${reportIds})&select=*`, { method: 'GET' }),
    supabaseRequest(`megcredit_client_bureau_case_status?report_id=in.(${reportIds})&select=*`, { method: 'GET' }),
  ]);
  const scores = scoresResult.ok ? await scoresResult.json() : [];
  const caseStatus = caseStatusResult.ok ? await caseStatusResult.json() : [];

  return reports.map((report) => ({
    ...report,
    scores: scores.filter((score) => score.report_id === report.id),
    caseStatus: caseStatus.filter((status) => status.report_id === report.id),
  }));
}

export default async function handler(request, response) {
  if (!allowedOrigin(request)) return json(response, 403, { error: 'Origen no autorizado.' });

  const active = await getActiveStaffSession(request);
  if (!active) return json(response, 401, { error: 'Sesión no válida.' });

  if (request.method === 'GET') {
    const clientAccountId = request.query?.clientAccountId;
    if (!isUuid(clientAccountId)) return json(response, 400, { error: 'Falta el id del cliente.' });

    try {
      const reports = await listReports(clientAccountId);
      return json(response, 200, { reports });
    } catch (error) {
      console.error('List bureau reports failed', error instanceof Error ? error.message : 'unknown error');
      return json(response, 500, { error: 'No pudimos cargar los reportes de buró.' });
    }
  }

  if (request.method === 'POST') {
    const body = request.body || {};
    const clientAccountId = body.clientAccountId;
    const filename = sanitizeFilename(body.filename);
    const mimeType = clean(body.mimeType, 100);
    const sizeBytes = Number(body.sizeBytes) || null;
    const asOfDate = clean(body.asOfDate, 10) || new Date().toISOString().slice(0, 10);

    if (!isUuid(clientAccountId)) return json(response, 400, { error: 'Falta el id del cliente.' });
    if (mimeType !== 'application/pdf') return json(response, 400, { error: 'Solo se permiten archivos PDF.' });
    if (sizeBytes && sizeBytes > 20 * 1024 * 1024) return json(response, 400, { error: 'El archivo supera el límite de 20 MB.' });

    try {
      const clientAccount = await supabaseOne(`megcredit_client_accounts?id=eq.${clientAccountId}&select=id`, { method: 'GET' });
      if (!clientAccount) return json(response, 404, { error: 'Cliente no encontrado.' });

      const path = `${clientAccountId}/${randomUUID()}-${filename}`;
      const { signedUrl, token } = await createSignedUploadUrl(path);

      const report = await supabaseOne('megcredit_client_bureau_reports', {
        method: 'POST',
        headers: { Prefer: 'return=representation' },
        body: JSON.stringify({
          client_account_id: clientAccountId,
          source: 'pdf_upload',
          as_of_date: asOfDate,
          storage_path: path,
          uploaded_by_staff_id: active.staff.id,
          parse_status: 'pending',
        }),
      });

      return json(response, 201, { uploadUrl: signedUrl, token, reportId: report.id, path });
    } catch (error) {
      console.error('Create bureau report failed', error instanceof Error ? error.message : 'unknown error');
      return json(response, 500, { error: 'No pudimos preparar la subida del reporte.' });
    }
  }

  response.setHeader('Allow', 'GET, POST');
  return json(response, 405, { error: 'Método no permitido.' });
}
