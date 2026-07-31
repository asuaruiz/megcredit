import { PDFParse } from 'pdf-parse';
import { getActiveStaffSession } from '../_lib/admin.js';
import { allowedOrigin, downloadStorageObject, isUuid, json, supabaseOne, supabaseRequest } from '../_lib/portal.js';

const BUCKET = 'megcredit-bureau-reports';

const BUREAU_PATTERNS = [
  ['equifax', /equifax/i],
  ['experian', /experian/i],
  ['transunion', /trans\s?union/i],
];

// Best-effort only: tri-merge PDF layouts vary a lot and pdf-parse flattens tables into
// plain text, so this just looks for a bureau name followed shortly after by a plausible
// FICO-range number. Staff always reviews/edits the result before it's confirmed and shown
// to the client (see bureau-report-confirm.js) -- this never writes parse_status=confirmed.
function extractScores(text) {
  const scores = {};
  for (const [bureau, pattern] of BUREAU_PATTERNS) {
    const match = pattern.exec(text);
    if (!match) continue;
    const window = text.slice(match.index, match.index + 120);
    const scoreMatch = window.match(/\b([3-8]\d{2})\b/);
    if (scoreMatch) {
      const score = Number(scoreMatch[1]);
      if (score >= 300 && score <= 850) scores[bureau] = score;
    }
  }
  return scores;
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
    const report = await supabaseOne(
      `megcredit_client_bureau_reports?id=eq.${reportId}&source=eq.pdf_upload&select=id,storage_path,as_of_date,parse_status`,
      { method: 'GET' },
    );
    if (!report) return json(response, 404, { error: 'Reporte no encontrado.' });
    if (report.parse_status === 'confirmed') {
      return json(response, 409, { error: 'Este reporte ya fue confirmado, no se puede volver a parsear.' });
    }

    const pdfResponse = await downloadStorageObject(BUCKET, report.storage_path);
    const buffer = Buffer.from(await pdfResponse.arrayBuffer());

    const parser = new PDFParse({ data: buffer });
    const { text } = await parser.getText();
    await parser.destroy();

    const scores = extractScores(text);

    await Promise.all(
      Object.entries(scores).map(([bureau, score]) =>
        supabaseRequest('megcredit_client_bureau_scores?on_conflict=report_id,bureau', {
          method: 'POST',
          headers: { Prefer: 'resolution=merge-duplicates,return=minimal' },
          body: JSON.stringify({ report_id: reportId, bureau, score, score_date: report.as_of_date }),
        }),
      ),
    );

    const patchResult = await supabaseRequest(`megcredit_client_bureau_reports?id=eq.${reportId}`, {
      method: 'PATCH',
      headers: { Prefer: 'return=minimal' },
      body: JSON.stringify({ parse_status: 'needs_review' }),
    });
    if (!patchResult.ok) throw new Error(`Report status update failed: ${patchResult.status}`);

    return json(response, 200, {
      ok: true,
      scoresFound: scores,
      bureausMissing: BUREAU_PATTERNS.map(([bureau]) => bureau).filter((bureau) => !(bureau in scores)),
    });
  } catch (error) {
    console.error('Parse bureau report failed', error instanceof Error ? error.message : 'unknown error');
    return json(response, 500, { error: 'No pudimos leer el PDF.' });
  }
}
