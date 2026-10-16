// Pure, DOM-free helpers so they can run under `node --test`.

export const TIME_UNSET = 'Giờ sẽ được cập nhật sớm';
export const DEFAULT_TITLE = 'dung@aicf:~/graduation';
export const DEFAULT_SUBMIT = 'Gửi ☕';

// Returns what the link decides: group key, greeting (with {giờ} filled), time text, skin,
// and the optional per-group hero photo and alt text, title-bar text and submit label (with defaults).
export function resolveGroup(search, content) {
  const key = (new URLSearchParams(search).get('g') || '').trim().toLowerCase();
  const groups = content.groups ?? {};
  const group = Object.prototype.hasOwnProperty.call(groups, key) ? groups[key] : null;
  const slot = String((group ? group.slot : content.ceremonyTime) ?? '').trim();
  const template = String((group ? group.greeting : content.neutralGreeting) ?? '');
  // Without a time, drop "lúc {giờ}" instead of leaving a blank in the sentence.
  const greeting = slot ? template.replace(/\{giờ\}/g, () => slot) : template.replace(/\s*lúc \{giờ\}|\{giờ\}/g, '');
  return {
    group: group ? key : 'none',
    greeting,
    time: slot || TIME_UNSET,
    skin: ['boot', 'moon', 'paper'].includes(group?.skin) ? group.skin : 'coffee',
    heroPhoto: group?.heroPhoto || content.heroPhoto || '',
    heroAlt: group?.heroAlt || content.heroAlt || '',
    title: group?.title || DEFAULT_TITLE,
    submitLabel: group?.submitLabel || DEFAULT_SUBMIT,
  };
}

export const VENUE_UNSET = 'Đại học FPT (địa điểm cụ thể cập nhật sau)';

// Venue text plus directions link; no link until a venue is set.
export function venueInfo(venue, mapUrl) {
  const v = (venue || '').trim();
  if (!v) return { text: VENUE_UNSET, href: null };
  return { text: v, href: mapUrl || 'https://www.google.com/maps/search/?api=1&query=' + encodeURIComponent(v) };
}

// Which optional sections have content to show.
export function visibleSections(content) {
  return { story: (content.story ?? []).length > 0, photos: (content.photos ?? []).length > 0 };
}

// POSTs the RSVP; resolves on success, throws on any network, HTTP or script failure.
export async function sendRsvp(url, data, fetchFn = fetch) {
  if (!url) throw new Error('appsScriptUrl is not set');
  // text/plain keeps this a simple request, so Apps Script needs no CORS preflight.
  const res = await fetchFn(url, {
    method: 'POST',
    headers: { 'Content-Type': 'text/plain;charset=utf-8' },
    body: JSON.stringify(data),
    // Ends a hung request in the failure state; optional call keeps older webviews working.
    signal: AbortSignal.timeout?.(20000),
  });
  if (!res.ok) throw new Error('HTTP ' + res.status);
  const reply = await res.json();
  if (!reply.ok) throw new Error(reply.error || 'script error');
}

// The payload Code.gs expects; keep keys in sync with apps-script/Code.gs.
export function buildRsvp(groupKey, fields) {
  const t = (v) => String(v ?? '').trim();
  return { group: t(groupKey), name: t(fields.name), attending: t(fields.attending), message: t(fields.message) };
}

// Returns { field: Vietnamese message } for each invalid field; empty object means valid.
export function validateRsvp(data) {
  const errors = {};
  if (!String(data.name ?? '').trim()) errors.name = 'Bạn nhập tên giúp Dũng nhé';
  if (!data.attending) errors.attending = 'Bạn chọn có đến hay không nhé';
  return errors;
}
