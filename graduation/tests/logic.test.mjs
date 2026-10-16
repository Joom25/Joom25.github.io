import { test } from 'node:test';
import assert from 'node:assert/strict';
import { resolveGroup, buildRsvp, validateRsvp, venueInfo, visibleSections, sendRsvp, TIME_UNSET, VENUE_UNSET, DEFAULT_TITLE, DEFAULT_SUBMIT, DEFAULT_YES, DEFAULT_NO } from '../js/logic.mjs';
import realContent from '../js/content.mjs';

const HER = '21-06-2026_10.8039n_106.7133e';
const content = {
  ceremonyTime: '08:00',
  heroPhoto: 'assets/hero.svg',
  heroAlt: 'Ảnh Dũng',
  neutralGreeting: 'Xin chào!',
  groups: {
    family: { greeting: 'Gặp cả nhà lúc {giờ}.', slot: '07:30', skin: 'coffee' },
    coworkers: { greeting: 'Gặp anh/chị lúc {giờ}.', slot: '09:00', skin: 'boot' },
    friends: { greeting: 'Ghé lúc {giờ} nha.', slot: '', skin: 'coffee' },
    [HER]: {
      greeting: '{tên em} ơi, đến lúc {giờ} nhé.', slot: '06:45', skin: 'cotton',
      heroPhoto: 'assets/hero-us.svg', heroAlt: 'Ảnh Dũng và em', title: 'dung@aicf:~/for-you', submitLabel: 'Em sẽ đến 💜',
    },
  },
};
const defaults = { heroPhoto: 'assets/hero.svg', heroAlt: 'Ảnh Dũng', title: DEFAULT_TITLE, submitLabel: DEFAULT_SUBMIT };
const answers = { yesLabel: DEFAULT_YES, noLabel: DEFAULT_NO };

test('group link: coworkers gets Boot Sequence, own greeting and slot', () => {
  assert.deepEqual(resolveGroup('?g=coworkers', content), {
    group: 'coworkers', greeting: 'Gặp anh/chị lúc 09:00.', time: '09:00', skin: 'boot', ...defaults, ...answers,
  });
});

test('group link: family gets Coffee.exe', () => {
  const r = resolveGroup('?g=family', content);
  assert.equal(r.skin, 'coffee');
  assert.equal(r.time, '07:30');
});

test('unknown or missing group: Coffee.exe, neutral greeting, ceremony time', () => {
  for (const search of ['?g=xyz', '', '?g=', '?g=toString', '?g=__proto__', '?g=21-06-2026']) {
    assert.deepEqual(resolveGroup(search, content), {
      group: 'none', greeting: 'Xin chào!', time: '08:00', skin: 'coffee', ...defaults, ...answers,
    }, search);
  }
});

test('time unset: placeholder text, greeting drops the time', () => {
  const r = resolveGroup('?g=friends', content);
  assert.equal(r.time, TIME_UNSET);
  assert.equal(r.greeting, 'Ghé nha.');
  const none = resolveGroup('', { ...content, ceremonyTime: '' });
  assert.equal(none.time, TIME_UNSET);
});

test('real content.mjs resolves every group without a leftover {giờ}', () => {
  for (const g of ['family', 'friends', 'classmates', 'coworkers', 'xyz']) {
    const r = resolveGroup(`?g=${g}`, realContent);
    assert.ok(r.greeting && !r.greeting.includes('{giờ}'), g);
  }
  assert.equal(resolveGroup('?g=coworkers', realContent).skin, 'boot');
  const her = resolveGroup('?g=21-06-2026_10.8039N_106.7133E', realContent);
  assert.equal(her.skin, 'cotton');
  assert.ok(!her.greeting.includes('{giờ}'));
  assert.equal(her.title, 'dung@aicf:~/for-you');
  assert.equal(her.submitLabel, 'Em sẽ đến 💜');
  assert.equal(her.heroPhoto, 'assets/hero-us.svg');
  assert.equal(her.heroAlt, 'Ảnh Dũng và em');
});

test('her link: Cotton Candy Sky, her greeting, slot, photo, title and button, any letter case', () => {
  for (const search of ['?g=21-06-2026_10.8039N_106.7133E', '?g=21-06-2026_10.8039n_106.7133e']) {
    assert.deepEqual(resolveGroup(search, content), {
      group: HER, greeting: '{tên em} ơi, đến lúc 06:45 nhé.', time: '06:45', skin: 'cotton',
      heroPhoto: 'assets/hero-us.svg', heroAlt: 'Ảnh Dũng và em', title: 'dung@aicf:~/for-you', submitLabel: 'Em sẽ đến 💜', ...answers,
    }, search);
  }
});

test('other groups keep default photo, title bar and "Gửi ☕"', () => {
  for (const g of ['family', 'friends', 'coworkers']) {
    const { heroPhoto, heroAlt, title, submitLabel } = resolveGroup(`?g=${g}`, content);
    assert.deepEqual({ heroPhoto, heroAlt, title, submitLabel }, defaults, g);
  }
});

test('test link: Paper, family greeting, Bo button and answer labels', () => {
  const g = resolveGroup('?g=test', realContent);
  assert.equal(g.skin, 'paper');
  assert.equal(g.greeting, resolveGroup('?g=family', realContent).greeting);
  assert.equal(g.submitLabel, 'Gửi cho Bo');
  assert.equal(g.yesLabel, 'Có, sẽ đến nhé');
  assert.equal(g.noLabel, 'Tiếc quá, không đến được rồi, gửi bo lời chúc ở đây nha');
  assert.equal(resolveGroup('?g=family', realContent).yesLabel, 'Có, mình sẽ đến');
});

test('her photo unset: falls back to the default hero photo', () => {
  const c = { ...content, groups: { [HER]: { ...content.groups[HER], heroPhoto: '' } } };
  assert.equal(resolveGroup(`?g=${HER}`, c).heroPhoto, 'assets/hero.svg');
});

test('unknown skin value falls back to coffee', () => {
  assert.equal(resolveGroup('?g=x', { groups: { x: { skin: 'neon' } } }).skin, 'coffee');
  assert.equal(resolveGroup('?g=x', { groups: { x: { skin: 'moon' } } }).skin, 'coffee'); // retired by Cotton Candy Sky
});

test('RSVP invalid: blank name and no choice give Vietnamese errors', () => {
  assert.deepEqual(validateRsvp({ name: '   ', attending: '' }), {
    name: 'Bạn nhập tên giúp Dũng nhé',
    attending: 'Bạn chọn có đến hay không nhé',
  });
});

test('RSVP valid: no errors, message optional', () => {
  assert.deepEqual(validateRsvp({ name: 'An', attending: 'Có', message: '' }), {});
});

test('venue unset: fallback text, no directions link', () => {
  assert.deepEqual(venueInfo('  ', ''), { text: VENUE_UNSET, href: null });
  const set = venueInfo('Đại học FPT Hòa Lạc', '');
  assert.equal(set.text, 'Đại học FPT Hòa Lạc');
  assert.match(set.href, /^https:\/\/www\.google\.com\/maps\/search\//);
  assert.equal(venueInfo('X', 'https://maps.app.goo.gl/abc').href, 'https://maps.app.goo.gl/abc');
});

test('story or photos empty: section hidden', () => {
  assert.deepEqual(visibleSections({ story: [], photos: [] }), { story: false, photos: false });
  assert.deepEqual(visibleSections({ story: ['a'], photos: [{ src: 'x' }] }), { story: true, photos: true });
});

const reply = (ok, body) => async () => ({ ok, status: ok ? 200 : 500, json: async () => body });

test('RSVP success: posts text/plain JSON and resolves', async () => {
  let sent;
  const fetchFn = async (url, opts) => { sent = { url, opts }; return reply(true, { ok: true })(); };
  await sendRsvp('https://script.example/exec', { name: 'An', attending: 'Có' }, fetchFn);
  assert.equal(sent.opts.method, 'POST');
  assert.match(sent.opts.headers['Content-Type'], /^text\/plain/);
  assert.deepEqual(JSON.parse(sent.opts.body), { name: 'An', attending: 'Có' });
});

test('RSVP failure: missing URL, network, HTTP and script errors all throw', async () => {
  await assert.rejects(sendRsvp('', {}, reply(true, { ok: true })));
  await assert.rejects(sendRsvp('u', {}, async () => { throw new TypeError('offline'); }));
  await assert.rejects(sendRsvp('u', {}, reply(false, {})));
  await assert.rejects(sendRsvp('u', {}, reply(true, { ok: false, error: 'x' })));
});

test('content missing fields: no throw, empty slot still shows placeholder (no ceremonyTime fallback)', () => {
  const stripped = { ceremonyTime: '08:00', groups: { family: { skin: 'coffee' } } };
  const bare = { heroPhoto: '', heroAlt: '', title: DEFAULT_TITLE, submitLabel: DEFAULT_SUBMIT };
  assert.deepEqual(resolveGroup('?g=family', stripped), { group: 'family', greeting: '', time: TIME_UNSET, skin: 'coffee', ...bare, ...answers });
  assert.deepEqual(resolveGroup('?g=x', {}), { group: 'none', greeting: '', time: TIME_UNSET, skin: 'coffee', ...bare, ...answers });
  assert.deepEqual(visibleSections({}), { story: false, photos: false });
});

test('slot is inserted literally, not as a replace pattern', () => {
  const c = { groups: { family: { greeting: 'lúc {giờ}.', slot: "$& $1 $'", skin: 'coffee' } } };
  assert.equal(resolveGroup('?g=family', c).greeting, "lúc $& $1 $'.");
});

test('buildRsvp: payload keys Code.gs reads, trimmed values', () => {
  assert.deepEqual(buildRsvp(' family ', { name: '  An ', attending: 'Có', message: ' Chúc mừng! \n' }), {
    group: 'family', name: 'An', attending: 'Có', message: 'Chúc mừng!',
  });
  assert.deepEqual(buildRsvp('none', {}), { group: 'none', name: '', attending: '', message: '' });
});
