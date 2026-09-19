const ATTRIBUTION_KEYS = Object.freeze({
  utm_source: 'utmSource',
  utm_medium: 'utmMedium',
  utm_campaign: 'utmCampaign',
  utm_content: 'utmContent',
  utm_term: 'utmTerm',
  fbclid: 'fbclid',
});

export function classifyDevice({ userAgent = '', viewportWidth = 0, maxTouchPoints = 0 } = {}) {
  const agent = String(userAgent);
  if (/iPad|Tablet|PlayBook|Silk/u.test(agent) || (/Android/u.test(agent) && !/Mobile/u.test(agent))) {
    return 'Tablet';
  }
  if (/Mobi|iPhone|iPod|Android/u.test(agent)) return 'Mobile';
  if (Number(viewportWidth) > 0 && Number(viewportWidth) <= 767) return 'Mobile';
  if (Number(viewportWidth) <= 1024 && Number(maxTouchPoints) > 0) return 'Tablet';
  return 'Desktop';
}

export function captureAttribution({
  location = globalThis.window?.location,
  documentRef = globalThis.document,
  navigatorRef = globalThis.navigator,
  viewportWidth = globalThis.window?.innerWidth ?? 0,
} = {}) {
  const searchParams = new URLSearchParams(location?.search ?? '');
  const attribution = {};
  Object.entries(ATTRIBUTION_KEYS).forEach(([queryName, propertyName]) => {
    attribution[propertyName] = searchParams.get(queryName) ?? '';
  });

  let entryUrl = '';
  try {
    const initialUrl = new URL(location?.href ?? '');
    initialUrl.hash = '';
    entryUrl = initialUrl.href;
  } catch {
    entryUrl = '';
  }

  return {
    ...attribution,
    entryUrl,
    referrer: documentRef?.referrer ?? '',
    device: classifyDevice({
      userAgent: navigatorRef?.userAgent ?? '',
      viewportWidth,
      maxTouchPoints: navigatorRef?.maxTouchPoints ?? 0,
    }),
  };
}

