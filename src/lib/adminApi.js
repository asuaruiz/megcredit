const JSON_HEADERS = { 'Content-Type': 'application/json' };

async function request(path, options = {}) {
  const response = await fetch(path, { credentials: 'include', ...options });
  const result = await response.json().catch(() => ({}));
  if (!response.ok) {
    const error = new Error(result.error || 'Ocurrió un error inesperado.');
    error.status = response.status;
    throw error;
  }
  return result;
}

export function fetchStaffMe() {
  return request('/api/admin/me');
}

export function staffLogin(email, password) {
  return request('/api/admin/login', { method: 'POST', headers: JSON_HEADERS, body: JSON.stringify({ email, password }) });
}

export function staffLogout() {
  return request('/api/admin/logout', { method: 'POST' });
}

export function fetchClients() {
  return request('/api/admin/clients');
}

export function fetchClientDetail(id) {
  return request(`/api/admin/client-detail?id=${encodeURIComponent(id)}`);
}

export function fetchCatalog(includeInactive = false) {
  return request(`/api/admin/services-catalog${includeInactive ? '?all=1' : ''}`);
}

export function createCatalogItem(payload) {
  return request('/api/admin/services-catalog', { method: 'POST', headers: JSON_HEADERS, body: JSON.stringify(payload) });
}

export function updateCatalogItem(payload) {
  return request('/api/admin/services-catalog', { method: 'PATCH', headers: JSON_HEADERS, body: JSON.stringify(payload) });
}

export function deleteCatalogItem(id) {
  return request(`/api/admin/services-catalog?id=${encodeURIComponent(id)}`, { method: 'DELETE' });
}

export function inviteClient(email, fullName) {
  return request('/api/portal/admin-invite', { method: 'POST', headers: JSON_HEADERS, body: JSON.stringify({ email, fullName }) });
}

export function fetchClientCreditMonitoring(id) {
  return request(`/api/admin/client-credit-monitoring?id=${encodeURIComponent(id)}`);
}

export function assignPlan(payload) {
  return request('/api/admin/assign-plan', { method: 'POST', headers: JSON_HEADERS, body: JSON.stringify(payload) });
}

export function reviewDocument(documentId, status) {
  return request('/api/admin/review-document', { method: 'POST', headers: JSON_HEADERS, body: JSON.stringify({ documentId, status }) });
}

export async function fetchDocumentFile(documentId) {
  const response = await fetch(`/api/admin/view-document?id=${encodeURIComponent(documentId)}`, { credentials: 'include' });
  if (!response.ok) {
    const result = await response.json().catch(() => ({}));
    throw new Error(result.error || 'No pudimos abrir el documento.');
  }
  return response.blob();
}

export async function fetchAgreementSignature(agreementId) {
  const response = await fetch(`/api/admin/view-agreement-signature?id=${encodeURIComponent(agreementId)}`, { credentials: 'include' });
  if (!response.ok) {
    const result = await response.json().catch(() => ({}));
    throw new Error(result.error || 'No pudimos cargar la firma del contrato.');
  }
  return response.blob();
}

export function resendPaymentLink(paymentPlanId) {
  return request('/api/admin/resend-payment-link', { method: 'POST', headers: JSON_HEADERS, body: JSON.stringify({ paymentPlanId }) });
}

export function cancelPlan(paymentPlanId) {
  return request('/api/admin/cancel-plan', { method: 'POST', headers: JSON_HEADERS, body: JSON.stringify({ paymentPlanId }) });
}

export function fetchPaymentHistory(paymentPlanId) {
  return request(`/api/admin/payment-history?id=${encodeURIComponent(paymentPlanId)}`);
}

export function sendPaymentReminder(paymentPlanId) {
  return request('/api/admin/send-payment-reminder', { method: 'POST', headers: JSON_HEADERS, body: JSON.stringify({ paymentPlanId }) });
}

export function fetchContracts() {
  return request('/api/admin/contracts');
}

export async function uploadAgreementPdf(clientId, file) {
  if (file.type !== 'application/pdf' || file.size > 15 * 1024 * 1024) throw new Error('Selecciona un PDF de hasta 15 MB.');
  const prepared = await request('/api/admin/agreement-upload-url', { method: 'POST', headers: JSON_HEADERS, body: JSON.stringify({ clientId, filename: file.name, sizeBytes: file.size }) });
  const uploaded = await fetch(prepared.uploadUrl, { method: 'PUT', headers: { 'Content-Type': 'application/pdf' }, body: file });
  if (!uploaded.ok) throw new Error('No pudimos subir el PDF.');
  return { path: prepared.path, filename: prepared.filename, sizeBytes: file.size };
}

export function attachAgreementPdf(agreementId, uploaded) {
  return request('/api/admin/attach-agreement-pdf', { method: 'POST', headers: JSON_HEADERS, body: JSON.stringify({ agreementId, ...uploaded }) });
}

export async function fetchAgreementPdf(agreementId) {
  const response = await fetch(`/api/admin/view-agreement-pdf?id=${encodeURIComponent(agreementId)}`, { credentials: 'include' });
  if (!response.ok) throw new Error('No pudimos abrir el PDF.');
  return response.blob();
}

export function archiveAgreement(agreementId, archived) {
  return request('/api/admin/archive-agreement', { method: 'POST', headers: JSON_HEADERS, body: JSON.stringify({ agreementId, archived }) });
}

export function fetchBureauReports(clientAccountId) {
  return request(`/api/admin/bureau-reports?clientAccountId=${encodeURIComponent(clientAccountId)}`);
}

export async function uploadBureauReportPdf(clientAccountId, file, asOfDate) {
  if (file.type !== 'application/pdf' || file.size > 20 * 1024 * 1024) throw new Error('Selecciona un PDF de hasta 20 MB.');
  const prepared = await request('/api/admin/bureau-reports', {
    method: 'POST',
    headers: JSON_HEADERS,
    body: JSON.stringify({ clientAccountId, filename: file.name, mimeType: file.type, sizeBytes: file.size, asOfDate }),
  });
  const uploaded = await fetch(prepared.uploadUrl, { method: 'PUT', headers: { 'Content-Type': 'application/pdf' }, body: file });
  if (!uploaded.ok) throw new Error('No pudimos subir el PDF.');
  return { reportId: prepared.reportId };
}

export function parseBureauReport(reportId) {
  return request('/api/admin/bureau-report-parse', { method: 'POST', headers: JSON_HEADERS, body: JSON.stringify({ reportId }) });
}

export function confirmBureauReport(reportId, scores, caseStatus) {
  return request('/api/admin/bureau-report-confirm', {
    method: 'POST',
    headers: JSON_HEADERS,
    body: JSON.stringify({ reportId, scores, caseStatus }),
  });
}

export function fetchContractTemplates() {
  return request('/api/admin/contract-templates');
}

export async function uploadContractTemplate(name, file) {
  if (file.type !== 'application/pdf' || file.size > 15 * 1024 * 1024) throw new Error('Selecciona un PDF de hasta 15 MB.');
  const prepared = await request('/api/admin/contract-template-upload-url', { method: 'POST', headers: JSON_HEADERS, body: JSON.stringify({ filename: file.name, sizeBytes: file.size }) });
  const uploaded = await fetch(prepared.uploadUrl, { method: 'PUT', headers: { 'Content-Type': 'application/pdf' }, body: file });
  if (!uploaded.ok) throw new Error('No pudimos subir el PDF.');
  return request('/api/admin/contract-templates', {
    method: 'POST',
    headers: JSON_HEADERS,
    body: JSON.stringify({ name, path: prepared.path, filename: prepared.filename, sizeBytes: file.size }),
  });
}

export function renameContractTemplate(id, name) {
  return request(`/api/admin/contract-template-detail?id=${encodeURIComponent(id)}`, { method: 'PATCH', headers: JSON_HEADERS, body: JSON.stringify({ name }) });
}

export function deleteContractTemplate(id) {
  return request(`/api/admin/contract-template-detail?id=${encodeURIComponent(id)}`, { method: 'DELETE' });
}

export async function fetchContractTemplatePdf(id) {
  const response = await fetch(`/api/admin/view-contract-template-pdf?id=${encodeURIComponent(id)}`, { credentials: 'include' });
  if (!response.ok) throw new Error('No pudimos abrir el PDF.');
  return response.blob();
}
