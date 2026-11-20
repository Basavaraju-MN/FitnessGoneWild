// Where this visitor came from (Instagram ad, Facebook ad, Google, ...), so
// the admin can see which ad brought each lead and booking.
//
// Read from the landing URL (utm_* tags, fbclid, gclid) and the referrer,
// and remembered for 30 days. A later visit from a real source replaces it;
// typing the address (direct) does not, so an ad still gets the credit.
//
// For Meta ads, put this in the ad's "URL parameters" field:
//   utm_source={{site_source_name}}&utm_medium=paid&utm_campaign={{campaign.name}}&utm_content={{ad.name}}
// ({{site_source_name}} becomes ig / fb / msg / an).

const KEY = 'fgwTrafficSource';
const KEEP_DAYS = 30;

const PAID_MEDIUMS = ['paid', 'cpc', 'ppc', 'ads', 'ad', 'paid_social', 'paidsocial', 'cpm'];

const NAMES = {
  ig: 'Instagram', instagram: 'Instagram',
  fb: 'Facebook', facebook: 'Facebook',
  msg: 'Messenger', messenger: 'Messenger',
  an: 'Meta Audience Network',
  google: 'Google', youtube: 'YouTube', whatsapp: 'WhatsApp', wa: 'WhatsApp',
};

const clip = (text, max) => String(text || '').trim().slice(0, max);

function fromReferrer(referrer) {
  let host = '';
  try {
    host = new URL(referrer).hostname.replace(/^www\./, '');
  } catch {
    return '';
  }
  if (!host || host === window.location.hostname) return '';
  if (host.includes('instagram')) return 'Instagram';
  if (host.includes('facebook') || host === 'fb.com' || host === 'fb.me') return 'Facebook';
  if (host.includes('google')) return 'Google search';
  if (host.includes('bing')) return 'Bing search';
  if (host.includes('youtube')) return 'YouTube';
  if (host.includes('whatsapp')) return 'WhatsApp';
  return host;
}

function detect() {
  const params = new URLSearchParams(window.location.search);
  const utmSource = (params.get('utm_source') || '').trim().toLowerCase();
  const utmMedium = (params.get('utm_medium') || '').trim().toLowerCase();
  const campaign = [params.get('utm_campaign'), params.get('utm_content')]
    .map((part) => clip(part, 80))
    .filter(Boolean)
    .join(' / ');
  const fbclid = params.get('fbclid');
  const gclid = params.get('gclid');
  const referrerName = fromReferrer(document.referrer);

  let source = '';
  if (utmSource) {
    const name = NAMES[utmSource] || utmSource;
    const paid = PAID_MEDIUMS.includes(utmMedium) || ((NAMES[utmSource] === 'Instagram' || NAMES[utmSource] === 'Facebook') && fbclid);
    source = paid ? `${name} ad` : name;
  } else if (gclid) {
    source = 'Google ad';
  } else if (fbclid) {
    // Meta adds fbclid to every link click; the referrer tells which app
    source = referrerName === 'Instagram' || referrerName === 'Facebook' ? referrerName : 'Facebook / Instagram';
  } else {
    source = referrerName;
  }

  return source ? { source: clip(source, 60), campaign: clip(campaign, 150) } : null;
}

// Call once when the website loads
export function rememberTrafficSource() {
  try {
    const found = detect();
    if (!found) return;
    localStorage.setItem(KEY, JSON.stringify({ ...found, at: Date.now() }));
  } catch {
    // Storage blocked: nothing to remember
  }
}

// { traffic_source, traffic_campaign } to send with a lead or booking
export function getTrafficSource() {
  try {
    const saved = JSON.parse(localStorage.getItem(KEY) || 'null');
    if (saved?.source && Date.now() - Number(saved.at || 0) < KEEP_DAYS * 86400000) {
      return { traffic_source: saved.source, traffic_campaign: saved.campaign || null };
    }
  } catch {
    // ignore
  }
  return { traffic_source: 'Direct / unknown', traffic_campaign: null };
}
