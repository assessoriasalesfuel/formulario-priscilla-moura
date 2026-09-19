export const LEAD_HEADERS = Object.freeze([
  'Lead ID',
  'Data de criação',
  'Status',
  'Nome',
  'WhatsApp',
  'E-mail',
  'Situação atual',
  'Principal preocupação',
  'Urgência',
  'Momento da contratação',
  'Motivo da classificação',
  'Data de conclusão',
  'Consentimento de dados',
  'Autorização de contato',
  'UTM Source',
  'UTM Medium',
  'UTM Campaign',
  'UTM Content',
  'UTM Term',
  'FBCLID',
  'URL de entrada',
  'Dispositivo',
]);

export const LEAD_COLUMNS = Object.freeze({
  leadId: 0,
  createdAt: 1,
  status: 2,
  name: 3,
  phone: 4,
  email: 5,
  situation: 6,
  concern: 7,
  urgency: 8,
  hiring: 9,
  reason: 10,
  completedAt: 11,
  dataConsent: 12,
  contactConsent: 13,
  utmSource: 14,
  utmMedium: 15,
  utmCampaign: 16,
  utmContent: 17,
  utmTerm: 18,
  fbclid: 19,
  entryUrl: 20,
  device: 21,
});

export const COLUMN_COUNT = LEAD_HEADERS.length;
export const LEAD_SHEET_NAME = 'Leads';
export const LEAD_LAST_COLUMN = 'V';
export const LEAD_HEADER_RANGE = `'${LEAD_SHEET_NAME}'!A1:${LEAD_LAST_COLUMN}1`;
export const LEAD_DATA_RANGE = `'${LEAD_SHEET_NAME}'!A2:${LEAD_LAST_COLUMN}`;

export function hasCanonicalLeadHeaders(headers) {
  return Array.isArray(headers)
    && headers.length === COLUMN_COUNT
    && LEAD_HEADERS.every((header, index) => headers[index] === header);
}

export function assertCanonicalLeadRow(row) {
  if (!Array.isArray(row) || row.length !== COLUMN_COUNT) {
    throw new TypeError(`A linha do lead deve conter exatamente ${COLUMN_COUNT} células.`);
  }
  return row;
}

export function normalizeLeadRow(row = []) {
  if (!Array.isArray(row) || row.length > COLUMN_COUNT) {
    throw new TypeError(`A linha lida deve conter no máximo ${COLUMN_COUNT} células.`);
  }
  return Array.from({ length: COLUMN_COUNT }, (_, index) => row[index] ?? '');
}
