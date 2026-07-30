const JSON_HEADERS = { 'Content-Type': 'application/json' };

async function request(path, options = {}) {
  const response = await fetch(path, { credentials: 'include', ...options });
  const result = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(result.error || 'Ocurrió un error inesperado.');
  return result;
}

export function fetchMe() {
  return request('/api/portal/me');
}

export function login(email, password) {
  return request('/api/portal/login', { method: 'POST', headers: JSON_HEADERS, body: JSON.stringify({ email, password }) });
}

export function activateAccount(token, password) {
  return request('/api/portal/activate', { method: 'POST', headers: JSON_HEADERS, body: JSON.stringify({ token, password }) });
}

export function logout() {
  return request('/api/portal/logout', { method: 'POST' });
}

export function fetchServices() {
  return request('/api/portal/services');
}

export function signAgreement(agreementId, fullName, signatureDataUrl) {
  return request('/api/portal/sign-agreement', { method: 'POST', headers: JSON_HEADERS, body: JSON.stringify({ agreementId, fullName, signatureDataUrl }) });
}

export function fetchOnboardingStatus() {
  return request('/api/portal/onboarding-status');
}

export function saveCreditMonitoring(payload) {
  return request('/api/portal/credit-monitoring', { method: 'POST', headers: JSON_HEADERS, body: JSON.stringify(payload) });
}

export async function payPlan(paymentPlanId) {
  const { url } = await request('/api/portal/create-checkout-session', {
    method: 'POST',
    headers: JSON_HEADERS,
    body: JSON.stringify({ paymentPlanId }),
  });
  window.location.href = url;
}

export async function uploadDocument(documentType, file) {
  const { uploadUrl } = await request('/api/portal/upload-url', {
    method: 'POST',
    headers: JSON_HEADERS,
    body: JSON.stringify({ documentType, filename: file.name, mimeType: file.type, sizeBytes: file.size }),
  });

  const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;
  const uploadHeaders = { 'content-type': file.type };
  if (anonKey) {
    uploadHeaders.apikey = anonKey;
    uploadHeaders.Authorization = `Bearer ${anonKey}`;
  }

  const uploadResponse = await fetch(uploadUrl, { method: 'PUT', headers: uploadHeaders, body: file });
  if (!uploadResponse.ok) throw new Error('No pudimos subir el archivo. Intenta nuevamente.');
}
