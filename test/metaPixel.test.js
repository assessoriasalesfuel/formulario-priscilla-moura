import test from 'node:test';
import assert from 'node:assert/strict';
import { createMetaPixelTracker } from '../public/js/metaPixel.js';

function createPixelWindow() {
  const calls = [];
  return { calls, fbq(...args) { calls.push(args); } };
}

test('Pixel ausente não quebra o rastreamento', () => {
  const tracker = createMetaPixelTracker({});
  assert.doesNotThrow(() => {
    tracker.trackFormStarted();
    tracker.trackFormCompleted();
    tracker.trackQualifiedLead(true);
    tracker.trackWhatsAppContact();
  });
});

test('exceção do Pixel não quebra o formulário nem marca o evento', () => {
  const tracker = createMetaPixelTracker({ fbq() { throw new Error('blocked'); } });
  assert.equal(tracker.trackFormStarted(), false);
  assert.equal(tracker.trackFormStarted(), false);
});

test('FormStarted dispara uma única vez', () => {
  const pixelWindow = createPixelWindow();
  const tracker = createMetaPixelTracker(pixelWindow);
  tracker.trackFormStarted();
  tracker.trackFormStarted();
  assert.deepEqual(pixelWindow.calls, [['trackCustom', 'FormStarted']]);
});

test('FormCompleted dispara uma única vez', () => {
  const pixelWindow = createPixelWindow();
  const tracker = createMetaPixelTracker(pixelWindow);
  tracker.trackFormCompleted();
  tracker.trackFormCompleted();
  assert.deepEqual(pixelWindow.calls, [['trackCustom', 'FormCompleted']]);
});

test('Lead não dispara para resultado desqualificado', () => {
  const pixelWindow = createPixelWindow();
  const tracker = createMetaPixelTracker(pixelWindow);
  assert.equal(tracker.trackQualifiedLead(false), false);
  assert.deepEqual(pixelWindow.calls, []);
});

test('Lead dispara uma vez depois de resultado qualificado', () => {
  const pixelWindow = createPixelWindow();
  const tracker = createMetaPixelTracker(pixelWindow);
  tracker.trackQualifiedLead(true);
  tracker.trackQualifiedLead(true);
  assert.deepEqual(pixelWindow.calls, [['track', 'Lead']]);
});

test('Contact dispara uma única vez após confirmação simulada do endpoint', async () => {
  const pixelWindow = createPixelWindow();
  const tracker = createMetaPixelTracker(pixelWindow);
  const endpointResult = await Promise.resolve({ link: 'https://wa.me/numero' });
  if (endpointResult.link) tracker.trackWhatsAppContact();
  tracker.trackWhatsAppContact();
  assert.deepEqual(pixelWindow.calls, [['track', 'Contact']]);
});

test('falha simulada do endpoint não dispara Contact', async () => {
  const pixelWindow = createPixelWindow();
  const tracker = createMetaPixelTracker(pixelWindow);
  try {
    await Promise.reject(new Error('endpoint failure'));
    tracker.trackWhatsAppContact();
  } catch {
    // O formulário trata a falha sem chamar o rastreamento.
  }
  assert.deepEqual(pixelWindow.calls, []);
});

test('eventos Meta são enviados sem parâmetros adicionais', () => {
  const pixelWindow = createPixelWindow();
  const tracker = createMetaPixelTracker(pixelWindow);
  tracker.trackFormStarted();
  tracker.trackFormCompleted();
  tracker.trackQualifiedLead(true);
  tracker.trackWhatsAppContact();
  assert.equal(pixelWindow.calls.every((call) => call.length === 2), true);
});

