export const WHATSAPP_NUMBER = '5527998737944';
export const WHATSAPP_MESSAGE = 'Olá, Dra. Priscilla. Acabei de preencher o formulário de análise inicial e gostaria de conversar sobre minha situação.';

export function createWhatsAppLink(number = WHATSAPP_NUMBER, message = WHATSAPP_MESSAGE) {
  const digits = String(number).replace(/\D/g, '');
  return `https://wa.me/${digits}?text=${encodeURIComponent(message)}`;
}

