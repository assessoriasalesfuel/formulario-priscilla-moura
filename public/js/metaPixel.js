export function createMetaPixelTracker(pixelWindow = globalThis.window) {
  const trackedEvents = new Set();

  function trackOnce(key, method, eventName, enabled = true) {
    if (!enabled || trackedEvents.has(key)) return false;
    try {
      if (typeof pixelWindow?.fbq !== 'function') return false;
      pixelWindow.fbq(method, eventName);
      trackedEvents.add(key);
      return true;
    } catch {
      return false;
    }
  }

  return Object.freeze({
    trackFormStarted: () => trackOnce('form-started', 'trackCustom', 'FormStarted'),
    trackFormCompleted: () => trackOnce('form-completed', 'trackCustom', 'FormCompleted'),
    trackQualifiedLead: (qualified) => trackOnce('qualified-lead', 'track', 'Lead', qualified === true),
    trackWhatsAppContact: () => trackOnce('whatsapp-contact', 'track', 'Contact'),
  });
}

const tracker = createMetaPixelTracker();

export const trackFormStarted = tracker.trackFormStarted;
export const trackFormCompleted = tracker.trackFormCompleted;
export const trackQualifiedLead = tracker.trackQualifiedLead;
export const trackWhatsAppContact = tracker.trackWhatsAppContact;

