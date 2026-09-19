import { randomUUID } from 'node:crypto';
import { classifyLead } from '../public/js/qualification.js';
import { questions } from '../public/js/questions.js';
import { validateEmail, validateName, validatePhone } from '../public/js/validation.js';
import { createWhatsAppLink } from '../public/js/whatsapp.js';

export const COLUMN_COUNT = 30;

const COLUMNS = Object.freeze({
  leadId: 0, createdAt: 1, status: 2, priority: 3, name: 4, phone: 5, email: 6, ddd: 7,
  situation: 8, concern: 9, urgency: 10, hiring: 11, reason: 12, lastStep: 13, updatedAt: 14,
  completedAt: 15, whatsappAccessed: 16, whatsappAccessedAt: 17, dataConsent: 18,
  contactConsent: 19, consentAt: 20,
  utmSource: 21, utmMedium: 22, utmCampaign: 23, utmContent: 24, utmTerm: 25,
  fbclid: 26, entryUrl: 27, referrer: 28, device: 29,
});

const ATTRIBUTION_LIMITS = Object.freeze({
  utmSource: 255,
  utmMedium: 255,
  utmCampaign: 255,
  utmContent: 255,
  utmTerm: 255,
  fbclid: 512,
  entryUrl: 2000,
  referrer: 2000,
});
const DEVICES = new Set(['Mobile', 'Tablet', 'Desktop']);
const CREATE_FIELDS = new Set(['name', 'phone', 'email', 'lastStep', ...Object.keys(ATTRIBUTION_LIMITS), 'device']);

const PRIORITY_LABELS = Object.freeze({ urgent: 'urgente', high: 'alta', normal: 'normal' });
const STEP_IDS = new Set(questions.map(({ id }) => id));
const OPTION_LABELS = new Map(
  questions.flatMap(({ id, options = [] }) => options.map(([value, label]) => [`${id}:${value}`, label])),
);
const CHOICE_IDS = new Map(
  questions.filter(({ type }) => type === 'choice').map(({ id, options }) => [id, new Set(options.map(([value]) => value))]),
);

export class LeadServiceError extends Error {
  constructor(message, statusCode = 400, code = 'INVALID_REQUEST') {
    super(message);
    this.name = 'LeadServiceError';
    this.statusCode = statusCode;
    this.code = code;
  }
}

export function protectSheetText(value) {
  const text = String(value ?? '');
  return /^[=+\-@]/u.test(text) ? `'${text}` : text;
}

function ensureObject(value) {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    throw new LeadServiceError('Payload inválido.');
  }
  return value;
}

function validatePersonal(payload) {
  const name = validateName(payload.name);
  const phone = validatePhone(payload.phone);
  const email = validateEmail(payload.email);
  const failure = [name, phone, email].find(({ valid }) => !valid);
  if (failure) throw new LeadServiceError(failure.error);
  return { name: name.value, phone: phone.value, email: email.value };
}

function validateChoice(id, value) {
  if (!CHOICE_IDS.get(id)?.has(value)) throw new LeadServiceError(`Resposta inválida para ${id}.`);
  return value;
}

function validateLastStep(value) {
  if (!STEP_IDS.has(value)) throw new LeadServiceError('Última etapa inválida.');
  return value;
}

function padRow(row = []) {
  return Array.from({ length: COLUMN_COUNT }, (_, index) => row[index] ?? '');
}

function applyPersonal(row, personal) {
  row[COLUMNS.name] = protectSheetText(personal.name);
  row[COLUMNS.phone] = personal.phone;
  row[COLUMNS.email] = protectSheetText(personal.email);
  row[COLUMNS.ddd] = personal.phone.slice(0, 2);
}

export function normalizeAttribution(payload = {}) {
  const normalized = {};
  Object.entries(ATTRIBUTION_LIMITS).forEach(([key, limit]) => {
    normalized[key] = typeof payload[key] === 'string'
      ? Array.from(payload[key]).slice(0, limit).join('')
      : '';
  });
  normalized.device = DEVICES.has(payload.device) ? payload.device : '';
  return normalized;
}

function applyAttribution(row, attribution) {
  Object.keys(ATTRIBUTION_LIMITS).forEach((key) => {
    row[COLUMNS[key]] = protectSheetText(attribution[key]);
  });
  row[COLUMNS.device] = attribution.device;
}

function toSheetLabel(id, value) {
  return protectSheetText(OPTION_LABELS.get(`${id}:${value}`));
}

export function createLeadService({ repository, now = () => new Date(), createId = randomUUID } = {}) {
  if (!repository) throw new TypeError('O repositório de leads é obrigatório.');
  const creationRequests = new Map();

  async function findLead(leadId) {
    if (typeof leadId !== 'string' || !leadId.trim()) throw new LeadServiceError('Lead ID inválido.');
    const match = await repository.findByLeadId(leadId);
    if (!match) throw new LeadServiceError('Lead não encontrado.', 404, 'LEAD_NOT_FOUND');
    return { rowNumber: match.rowNumber, row: padRow(match.row) };
  }

  async function create(payload) {
    ensureObject(payload);
    if (Object.keys(payload).some((key) => !CREATE_FIELDS.has(key))) {
      throw new LeadServiceError('Payload de criação inválido.');
    }
    const personal = validatePersonal(payload);
    const attribution = normalizeAttribution(payload);
    const lastStep = validateLastStep(payload.lastStep);
    const timestamp = now().toISOString();
    const leadId = createId();
    const row = padRow();
    row[COLUMNS.leadId] = leadId;
    row[COLUMNS.createdAt] = timestamp;
    row[COLUMNS.status] = 'Em preenchimento';
    applyPersonal(row, personal);
    applyAttribution(row, attribution);
    row[COLUMNS.lastStep] = lastStep;
    row[COLUMNS.updatedAt] = timestamp;
    await repository.append(row);
    return { leadId, status: 'Em preenchimento' };
  }

  return {
    async createLead(payload, idempotencyKey) {
      if (!idempotencyKey) return create(payload);
      if (typeof idempotencyKey !== 'string' || idempotencyKey.length > 100) {
        throw new LeadServiceError('Chave de idempotência inválida.');
      }
      if (creationRequests.has(idempotencyKey)) return creationRequests.get(idempotencyKey);
      const request = create(payload).catch((error) => {
        creationRequests.delete(idempotencyKey);
        throw error;
      });
      creationRequests.set(idempotencyKey, request);
      return request;
    },

    async updateLead(leadId, payload) {
      ensureObject(payload);
      const allowed = new Set(['situation', 'concern', 'urgency', 'hiring', 'lastStep', 'name', 'phone', 'email']);
      const keys = Object.keys(payload);
      if (!keys.length || keys.some((key) => !allowed.has(key))) {
        throw new LeadServiceError('Payload de atualização inválido.');
      }

      const { rowNumber, row } = await findLead(leadId);
      if (payload.name !== undefined || payload.phone !== undefined || payload.email !== undefined) {
        const personal = validatePersonal({
          name: payload.name ?? row[COLUMNS.name].replace(/^'/u, ''),
          phone: payload.phone ?? row[COLUMNS.phone],
          email: payload.email ?? row[COLUMNS.email].replace(/^'/u, ''),
        });
        applyPersonal(row, personal);
      }
      for (const id of ['situation', 'concern', 'urgency', 'hiring']) {
        if (payload[id] !== undefined) row[COLUMNS[id]] = toSheetLabel(id, validateChoice(id, payload[id]));
      }
      if (payload.lastStep !== undefined) row[COLUMNS.lastStep] = validateLastStep(payload.lastStep);
      row[COLUMNS.updatedAt] = now().toISOString();
      await repository.update(rowNumber, row);
      return { leadId, status: row[COLUMNS.status] };
    },

    async completeLead(leadId, payload) {
      ensureObject(payload);
      const personal = validatePersonal(payload);
      const normalized = {
        ...personal,
        situation: validateChoice('situation', payload.situation),
        concern: validateChoice('concern', payload.concern),
        urgency: validateChoice('urgency', payload.urgency),
        hiring: validateChoice('hiring', payload.hiring),
        dataConsent: payload.dataConsent === true,
        contactConsent: payload.contactConsent === true,
      };
      if (!normalized.dataConsent || !normalized.contactConsent) {
        throw new LeadServiceError('As duas confirmações são obrigatórias.');
      }

      const { rowNumber, row } = await findLead(leadId);
      const result = classifyLead(normalized);
      const timestamp = now().toISOString();
      applyPersonal(row, personal);
      for (const id of ['situation', 'concern', 'urgency', 'hiring']) row[COLUMNS[id]] = toSheetLabel(id, normalized[id]);
      row[COLUMNS.status] = result.classification === 'qualified' ? 'Qualificado' : 'Desqualificado';
      row[COLUMNS.priority] = PRIORITY_LABELS[result.priority];
      row[COLUMNS.reason] = protectSheetText(result.reason);
      row[COLUMNS.lastStep] = 'consent';
      row[COLUMNS.updatedAt] = timestamp;
      row[COLUMNS.completedAt] ||= timestamp;
      row[COLUMNS.dataConsent] = 'Sim';
      row[COLUMNS.contactConsent] = 'Sim';
      row[COLUMNS.consentAt] ||= timestamp;
      await repository.update(rowNumber, row);

      return {
        classification: result.classification,
        priority: result.priority,
        qualified: result.classification === 'qualified',
        leadId,
      };
    },

    async registerWhatsAppAccess(leadId) {
      const { rowNumber, row } = await findLead(leadId);
      if (row[COLUMNS.status] !== 'Qualificado' || !row[COLUMNS.completedAt]) {
        throw new LeadServiceError('WhatsApp indisponível para este lead.', 403, 'WHATSAPP_NOT_ALLOWED');
      }
      if (row[COLUMNS.whatsappAccessed] !== 'Sim') {
        row[COLUMNS.whatsappAccessed] = 'Sim';
        row[COLUMNS.whatsappAccessedAt] = now().toISOString();
        await repository.update(rowNumber, row);
      }
      return { link: createWhatsAppLink() };
    },
  };
}
