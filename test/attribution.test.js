import test from 'node:test';
import assert from 'node:assert/strict';
import { captureAttribution, classifyDevice } from '../public/js/attribution.js';

function capture(search = '', overrides = {}) {
  return captureAttribution({
    location: { search, href: `https://example.com/form${search}#etapa` },
    documentRef: { referrer: '' },
    navigatorRef: { userAgent: 'Desktop Browser', maxTouchPoints: 0 },
    viewportWidth: 1440,
    ...overrides,
  });
}

test('captura UTM Source', () => {
  assert.equal(capture('?utm_source=facebook').utmSource, 'facebook');
});

test('captura UTM Medium', () => {
  assert.equal(capture('?utm_medium=paid_social').utmMedium, 'paid_social');
});

test('captura UTM Campaign', () => {
  assert.equal(capture('?utm_campaign=campanha').utmCampaign, 'campanha');
});

test('captura UTM Content', () => {
  assert.equal(capture('?utm_content=criativo-a').utmContent, 'criativo-a');
});

test('captura UTM Term', () => {
  assert.equal(capture('?utm_term=termo').utmTerm, 'termo');
});

test('captura FBCLID', () => {
  assert.equal(capture('?fbclid=abc123').fbclid, 'abc123');
});

test('captura URL de entrada sem fragmento', () => {
  assert.equal(capture('?utm_source=meta').entryUrl, 'https://example.com/form?utm_source=meta');
});

test('preserva referrer vazio sem inventar valor', () => {
  assert.equal(capture().referrer, '');
});

test('captura referrer informado', () => {
  const result = capture('', { documentRef: { referrer: 'https://referencia.example/' } });
  assert.equal(result.referrer, 'https://referencia.example/');
});

test('classifica somente categorias genéricas de dispositivo', () => {
  assert.equal(classifyDevice({ userAgent: 'Mozilla iPhone', viewportWidth: 390 }), 'Mobile');
  assert.equal(classifyDevice({ userAgent: 'Mozilla iPad', viewportWidth: 820, maxTouchPoints: 5 }), 'Tablet');
  assert.equal(classifyDevice({ userAgent: 'Desktop Browser', viewportWidth: 1440 }), 'Desktop');
});

test('ausência de parâmetros retorna campos de atribuição vazios', () => {
  assert.deepEqual(capture(), {
    utmSource: '', utmMedium: '', utmCampaign: '', utmContent: '', utmTerm: '', fbclid: '',
    entryUrl: 'https://example.com/form', referrer: '', device: 'Desktop',
  });
});

