import test from 'node:test';
import assert from 'node:assert/strict';
import {
  assertCanonicalLeadRow,
  COLUMN_COUNT,
  hasCanonicalLeadHeaders,
  LEAD_COLUMNS,
  LEAD_DATA_RANGE,
  LEAD_HEADERS,
  normalizeLeadRow,
} from '../server/leadSchema.js';

test('schema canônico define exatamente 22 colunas de A até V', () => {
  assert.equal(COLUMN_COUNT, 22);
  assert.equal(LEAD_HEADERS.length, 22);
  assert.equal(LEAD_DATA_RANGE, "'Leads'!A2:V");
  assert.deepEqual(LEAD_COLUMNS, {
    leadId: 0, createdAt: 1, status: 2, name: 3, phone: 4, email: 5,
    situation: 6, concern: 7, urgency: 8, hiring: 9, reason: 10,
    completedAt: 11, dataConsent: 12, contactConsent: 13,
    utmSource: 14, utmMedium: 15, utmCampaign: 16, utmContent: 17, utmTerm: 18,
    fbclid: 19, entryUrl: 20, device: 21,
  });
});

test('validação exige cabeçalhos na ordem canônica', () => {
  assert.equal(hasCanonicalLeadHeaders(LEAD_HEADERS), true);
  const shifted = [...LEAD_HEADERS];
  [shifted[3], shifted[4]] = [shifted[4], shifted[3]];
  assert.equal(hasCanonicalLeadHeaders(shifted), false);
  assert.equal(hasCanonicalLeadHeaders([...LEAD_HEADERS, 'Extra']), false);
});

test('linhas de escrita exigem 22 células e leituras são normalizadas sem truncar excesso', () => {
  assert.equal(assertCanonicalLeadRow(Array(22).fill('')).length, 22);
  assert.throws(() => assertCanonicalLeadRow(Array(21).fill('')), /22 células/u);
  assert.throws(() => assertCanonicalLeadRow(Array(30).fill('')), /22 células/u);
  assert.equal(normalizeLeadRow(['id']).length, 22);
  assert.throws(() => normalizeLeadRow(Array(30).fill('')), /no máximo 22/u);
});
