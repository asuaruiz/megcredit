import { extractText, getDocumentProxy } from 'unpdf';
import { getActiveStaffSession } from '../_lib/admin.js';
import { allowedOrigin, downloadStorageObject, isUuid, json, supabaseOne, supabaseRequest } from '../_lib/portal.js';

const BUCKET = 'megcredit-bureau-reports';

const BUREAUS = ['transunion', 'experian', 'equifax'];

// Best-effort only: tri-merge PDF layouts vary, so this only handles the SmartCredit
// "Classic 3B Report" layout, which always prints the three bureau headers
// (TransUnion/Experian/Equifax, in that order) immediately followed by three per-bureau
// numbers in the same order -- e.g. "TransUnion Experian Equifax 530 520 527" for scores,
// or "...16 15 15" for the Summary's Total Accounts row. It intentionally does NOT match on
// a bureau name alone followed by "the next number it finds": that header trio repeats as a
// plain table header throughout the report (Personal Information, Summary, every account)
// but is followed by text labels everywhere except the two real per-bureau value rows, so
// requiring three numbers immediately after the header trio is what makes this selective.
// Staff always reviews/edits the result before it's confirmed and shown to the client (see
// bureau-report-confirm.js) -- this never writes parse_status=confirmed.
function extractBureauTriplets(text) {
  const pattern = /TransUnion[^A-Za-z0-9]{0,10}Experian[^A-Za-z0-9]{0,10}Equifax[^A-Za-z0-9]{0,20}(\d{1,3})\D{1,10}(\d{1,3})\D{1,10}(\d{1,3})/gi;
  return [...text.matchAll(pattern)].map((match) => {
    const values = {};
    BUREAUS.forEach((bureau, index) => { values[bureau] = Number(match[index + 1]); });
    return values;
  });
}

function isScoreTriplet(values) {
  return BUREAUS.every((bureau) => values[bureau] >= 300 && values[bureau] <= 850);
}

function extractScores(text) {
  const triplet = extractBureauTriplets(text).find(isScoreTriplet);
  return triplet || {};
}

// Proxy only: "Account Rating" (Derogatory/Open/Closed/Paid) is not the same thing as
// dispute outcome, but it's a more useful starting point than zero everywhere -- staff
// still edits every number before confirming. Each account block prints its per-bureau
// Account Rating, Account Description (Individual/Joint/...), and Dispute Status
// (e.g. "Account not disputed") as three consecutive value rows, in that order, with "——"
// standing in for bureaus that don't report that account. Anchoring on all three together
// (rather than "Account Rating" alone) is what keeps this from matching stray occurrences
// of common words like "Open" or "Closed" elsewhere in the report (e.g. Account Status).
const RATING_CELL = '(Derogatory|Open|Closed|Paid|——)';
const DESCRIPTION_CELL = '(Individual|Joint|Co-maker\\/Signer|Authorized User|Responsible in Case of Default|——)';
const DISPUTE_CELL = '(Account not disputed|Account disputed|In dispute|——)';
const ACCOUNT_RATING_PATTERN = new RegExp(
  [RATING_CELL, RATING_CELL, RATING_CELL, DESCRIPTION_CELL, DESCRIPTION_CELL, DESCRIPTION_CELL, DISPUTE_CELL, DISPUTE_CELL, DISPUTE_CELL].join(
    '\\s+',
  ),
  'g',
);

function ratingToStatusCategory(rating) {
  if (rating === 'Derogatory') return 'negative';
  if (rating === 'Open' || rating === 'Closed' || rating === 'Paid') return 'positive';
  return null; // "——" -- bureau doesn't report this account, don't count it either way
}

function extractCaseStatusProxy(text) {
  const counts = { transunion: {}, experian: {}, equifax: {} };
  for (const match of text.matchAll(ACCOUNT_RATING_PATTERN)) {
    BUREAUS.forEach((bureau, index) => {
      const category = ratingToStatusCategory(match[index + 1]);
      if (!category) return;
      counts[bureau][category] = (counts[bureau][category] || 0) + 1;
    });
  }
  return counts;
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
    const buffer = new Uint8Array(await pdfResponse.arrayBuffer());

    const pdf = await getDocumentProxy(buffer);
    const { text } = await extractText(pdf, { mergePages: true });

    const scores = extractScores(text);
    const caseStatusProxy = extractCaseStatusProxy(text);
    const caseStatusRows = BUREAUS.flatMap((bureau) =>
      Object.entries(caseStatusProxy[bureau]).map(([statusCategory, count]) => ({ bureau, statusCategory, count })),
    );

    await Promise.all([
      ...Object.entries(scores).map(([bureau, score]) =>
        supabaseRequest('megcredit_client_bureau_scores?on_conflict=report_id,bureau', {
          method: 'POST',
          headers: { Prefer: 'resolution=merge-duplicates,return=minimal' },
          body: JSON.stringify({ report_id: reportId, bureau, score, score_date: report.as_of_date }),
        }),
      ),
      ...caseStatusRows.map(({ bureau, statusCategory, count }) =>
        supabaseRequest('megcredit_client_bureau_case_status?on_conflict=report_id,bureau,status_category', {
          method: 'POST',
          headers: { Prefer: 'resolution=merge-duplicates,return=minimal' },
          body: JSON.stringify({ report_id: reportId, bureau, status_category: statusCategory, count }),
        }),
      ),
    ]);

    const patchResult = await supabaseRequest(`megcredit_client_bureau_reports?id=eq.${reportId}`, {
      method: 'PATCH',
      headers: { Prefer: 'return=minimal' },
      body: JSON.stringify({ parse_status: 'needs_review' }),
    });
    if (!patchResult.ok) throw new Error(`Report status update failed: ${patchResult.status}`);

    return json(response, 200, {
      ok: true,
      scoresFound: scores,
      bureausMissing: BUREAUS.filter((bureau) => !(bureau in scores)),
    });
  } catch (error) {
    console.error('Parse bureau report failed', error instanceof Error ? error.message : 'unknown error');
    return json(response, 500, { error: 'No pudimos leer el PDF.' });
  }
}
