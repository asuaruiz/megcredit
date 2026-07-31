const JSON_HEADERS = { 'Content-Type': 'application/json' };

async function request(path, options = {}) {
  const response = await fetch(path, { credentials: 'include', ...options });
  const result = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(result.error || 'Ocurrió un error inesperado.');
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

export function fetchCatalog() {
  return request('/api/admin/services-catalog');
}

export function createCatalogItem(payload) {
  return request('/api/admin/services-catalog', { method: 'POST', headers: JSON_HEADERS, body: JSON.stringify(payload) });
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

export function fetchDocumentUrl(documentId) {
  return request(`/api/admin/view-document?id=${encodeURIComponent(documentId)}`);
}

export function resendPaymentLink(paymentPlanId) {
  return request('/api/admin/resend-payment-link', { method: 'POST', headers: JSON_HEADERS, body: JSON.stringify({ paymentPlanId }) });
}
