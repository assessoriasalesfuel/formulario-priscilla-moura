export class LeadGatewayError extends Error {
  constructor(message, code = 'REQUEST_FAILED') {
    super(message);
    this.name = 'LeadGatewayError';
    this.code = code;
  }
}

async function request(url, { method, body, headers = {} } = {}) {
  let response;
  try {
    response = await fetch(url, {
      method,
      headers: { 'Content-Type': 'application/json', ...headers },
      body: body === undefined ? undefined : JSON.stringify(body),
    });
  } catch {
    throw new LeadGatewayError('Não foi possível conectar ao servidor. Tente novamente.');
  }

  let data;
  try {
    data = await response.json();
  } catch {
    throw new LeadGatewayError('O servidor retornou uma resposta inválida.');
  }

  if (!response.ok) {
    throw new LeadGatewayError(data?.error?.message || 'Não foi possível salvar suas respostas.', data?.error?.code);
  }
  return data;
}

export function createLead(payload, idempotencyKey) {
  return request('/api/leads', {
    method: 'POST',
    body: payload,
    headers: { 'Idempotency-Key': idempotencyKey },
  });
}

export function updateLead(leadId, payload) {
  return request(`/api/leads/${encodeURIComponent(leadId)}`, { method: 'PATCH', body: payload });
}

export function completeLead(leadId, payload) {
  return request(`/api/leads/${encodeURIComponent(leadId)}/complete`, { method: 'POST', body: payload });
}

export function registerWhatsAppAccess(leadId) {
  return request(`/api/leads/${encodeURIComponent(leadId)}/whatsapp`, { method: 'POST' });
}
