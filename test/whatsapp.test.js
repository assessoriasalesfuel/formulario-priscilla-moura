import test from 'node:test';
import assert from 'node:assert/strict';
import { createWhatsAppLink, WHATSAPP_MESSAGE, WHATSAPP_NUMBER } from '../public/js/whatsapp.js';

test('gera link correto do WhatsApp somente com dígitos no número', () => {
  const link = createWhatsAppLink('+55 (27) 99873-7944', 'Olá');
  assert.equal(link, 'https://wa.me/5527998737944?text=Ol%C3%A1');
});

test('codifica corretamente a mensagem padrão do WhatsApp', () => {
  const expected = `https://wa.me/${WHATSAPP_NUMBER}?text=${encodeURIComponent(WHATSAPP_MESSAGE)}`;
  assert.equal(createWhatsAppLink(), expected);
  assert.match(createWhatsAppLink(), /%2C|%20/);
});

