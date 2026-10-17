// Pure, DOM-free helpers so they can run under `node --test`.

export const TIME_UNSET = 'Giờ sẽ được cập nhật sớm';
export const DEFAULT_TITLE = 'dung@aicf:~/graduation';
export const DEFAULT_SUBMIT = 'Gửi ☕';
export const DEFAULT_YES = 'Có, mình sẽ đến';
export const DEFAULT_NO = 'Tiếc quá, mình không đến được';
// Fills {name} when a group link (not a personal one) is opened.
export const NAME_UNSET = 'bạn';

// Skins besides the default 'coffee'.
export const SKINS = ['boot', 'cotton', 'paper'];
// Fields a person may set for themselves (US-4); blank means "use the group's".
const OVERRIDES = ['greeting', 'slot', 'skin', 'title', 'submitLabel', 'yesLabel', 'noLabel'];

const own = (obj, key) => Object.prototype.hasOwnProperty.call(obj, key);

// Site content plus the generated js/people.mjs: each generated group's fields go over the same group
// in content.mjs (so fields the CSV has no column for survive), and people come only from the generated file.
export function withGuests(content, guests) {
  const groups = { ...content.groups };
  for (const [k, g] of Object.entries(guests?.groups ?? {})) groups[k] = { ...(own(groups, k) ? groups[k] : {}), ...g };
  return { ...content, groups, people: guests?.people ?? {} };
}

// Returns what the link decides: link key, greeting (with {name} and {time} filled), time text, skin,
// and the optional hero photo and alt text, title-bar text, submit label and yes/no answer labels (with defaults).
// A personal link (content.people) takes each field from the person if set, else from its group.
export function resolveGroup(search, content) {
  const key = (new URLSearchParams(search).get('g') || '').trim().toLowerCase();
  const groups = content.groups ?? {};
  const people = content.people ?? {};
  // A person whose group is missing falls through to the neutral page, like an unknown key.
  const person = own(people, key) && own(groups, String(people[key]?.group)) ? people[key] : null;
  const base = person ? groups[person.group] : own(groups, key) ? groups[key] : null;
  const set = (f) => String(person?.[f] ?? '').trim() !== '';
  const group = base && Object.fromEntries(OVERRIDES.map((f) => [f, set(f) ? person[f] : base[f]]));
  const slot = String((group ? group.slot : content.ceremonyTime) ?? '').trim();
  const name = String(person?.name ?? '').trim() || NAME_UNSET;
  const template = String((group ? group.greeting : content.neutralGreeting) ?? '');
  // Without a time, drop "lúc {time}" instead of leaving a blank in the sentence.
  const filled = slot ? template : template.replace(/\s*lúc \{time\}|\{time\}/g, '');
  // One pass with a callback: values go in literally and are never re-expanded.
  const greeting = filled.replace(/\{(name|time)\}/g, (_, k) => (k === 'name' ? name : slot));
  // Photo and alt travel together: the first of person, group, site that has a photo.
  const photo = [person, base, content].find((o) => o?.heroPhoto);
  return {
    group: group ? key : 'none',
    greeting,
    time: slot || TIME_UNSET,
    skin: SKINS.includes(group?.skin) ? group.skin : 'coffee',
    heroPhoto: photo?.heroPhoto || '',
    heroAlt: photo?.heroAlt || content.heroAlt || '',
    title: group?.title || DEFAULT_TITLE,
    submitLabel: group?.submitLabel || DEFAULT_SUBMIT,
    yesLabel: group?.yesLabel || DEFAULT_YES,
    noLabel: group?.noLabel || DEFAULT_NO,
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
