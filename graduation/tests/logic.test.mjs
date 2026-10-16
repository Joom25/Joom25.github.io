import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { resolveGroup, buildRsvp, validateRsvp, venueInfo, visibleSections, sendRsvp, TIME_UNSET, VENUE_UNSET, DEFAULT_TITLE, DEFAULT_SUBMIT, DEFAULT_YES, DEFAULT_NO, NAME_UNSET } from '../js/logic.mjs';
import realContent from '../js/content.mjs';

const HER = '21-06-2026_10.8039n_106.7133e';
const content = {
  ceremonyTime: '08:00',
  heroPhoto: 'assets/hero.svg',
  heroAlt: 'Ảnh Dũng',
  neutralGreeting: 'Xin chào!',
  groups: {
    family: { greeting: 'Gặp cả nhà lúc {time}.', slot: '07:30', skin: 'coffee' },
    coworkers: { greeting: 'Gặp anh/chị lúc {time}.', slot: '09:00', skin: 'boot' },
    friends: { greeting: 'Ghé lúc {time} nha.', slot: '', skin: 'coffee' },
    [HER]: {
      greeting: '{nickname} ơi, đến lúc {time} nhé.', slot: '06:45', skin: 'moon',
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

test('real content.mjs resolves every group without a leftover {time}', () => {
  for (const g of ['family', 'friends', 'classmates', 'coworkers', 'xyz']) {
    const r = resolveGroup(`?g=${g}`, realContent);
    assert.ok(r.greeting && !r.greeting.includes('{time}'), g);
  }
  assert.equal(resolveGroup('?g=coworkers', realContent).skin, 'boot');
  const her = resolveGroup('?g=21-06-2026_10.8039N_106.7133E', realContent);
  assert.equal(her.skin, 'moon');
  assert.ok(!her.greeting.includes('{time}'));
  assert.equal(her.title, 'dung@aicf:~/for-you');
  assert.equal(her.submitLabel, 'Em sẽ đến 💜');
  assert.equal(her.heroPhoto, 'assets/hero-us.svg');
  assert.equal(her.heroAlt, 'Ảnh Dũng và em');
});

test('her link: Moonlight, her greeting, slot, photo, title and button, any letter case', () => {
  for (const search of ['?g=21-06-2026_10.8039N_106.7133E', '?g=21-06-2026_10.8039n_106.7133e']) {
    assert.deepEqual(resolveGroup(search, content), {
      group: HER, greeting: '{nickname} ơi, đến lúc 06:45 nhé.', time: '06:45', skin: 'moon',
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
  const c = { groups: { family: { greeting: 'lúc {time}.', slot: "$& $1 $'", skin: 'coffee' } } };
  assert.equal(resolveGroup('?g=family', c).greeting, "lúc $& $1 $'.");
});

test('buildRsvp: payload keys Code.gs reads, trimmed values', () => {
  assert.deepEqual(buildRsvp(' family ', { name: '  An ', attending: 'Có', message: ' Chúc mừng! \n' }), {
    group: 'family', name: 'An', attending: 'Có', message: 'Chúc mừng!',
  });
  assert.deepEqual(buildRsvp('none', {}), { group: 'none', name: '', attending: '', message: '' });
});

// US-1: English placeholders
test('US-1 time is filled in', () => {
  const c = { groups: { family: { greeting: 'Gặp cả nhà lúc {time}.', slot: '07:30' } } };
  assert.equal(resolveGroup('?g=family', c).greeting, 'Gặp cả nhà lúc 07:30.');
});

test('US-1 no time set yet: "lúc {time}" dropped, time row shows placeholder', () => {
  const r = resolveGroup('?g=family', { groups: { family: { greeting: 'Gặp cả nhà lúc {time}.', slot: '' } } });
  assert.equal(r.greeting, 'Gặp cả nhà.');
  assert.equal(r.time, TIME_UNSET);
});

test('US-1 old placeholder is gone from content, logic and tests', () => {
  const old = '{gi' + 'ờ}';
  for (const f of ['../js/content.mjs', '../js/logic.mjs', './logic.test.mjs']) {
    assert.ok(!readFileSync(new URL(f, import.meta.url), 'utf8').includes(old), f);
  }
});

// US-2: elders and siblings on Paper
const BO = { submitLabel: 'Gửi cho Bo', yesLabel: 'Có, sẽ đến nhé', noLabel: 'Tiếc quá, không đến được rồi, gửi bo lời chúc ở đây nha' };

test('US-2 elders and siblings: Paper, Bo wording, own greeting', () => {
  for (const key of ['elders', 'siblings']) {
    const r = resolveGroup(`?g=${key}`, realContent);
    assert.equal(r.group, key);
    assert.equal(r.skin, 'paper', key);
    assert.deepEqual({ submitLabel: r.submitLabel, yesLabel: r.yesLabel, noLabel: r.noLabel }, BO, key);
    assert.equal(r.greeting.replaceAll(NAME_UNSET, '{name}'), realContent.groups[key].greeting.replace(/\s*lúc \{time\}/g, ''), key);
  }
  assert.notEqual(resolveGroup('?g=elders', realContent).greeting, resolveGroup('?g=siblings', realContent).greeting);
});

test('US-2 family stays the backup link on Coffee.exe', () => {
  const r = resolveGroup('?g=family', realContent);
  assert.equal(r.skin, 'coffee');
  assert.match(r.greeting, /^Kính mời ông bà, bố mẹ, cô dì chú bác và anh chị em/);
});

// US-3: personal link inherits from its group
const pc = {
  heroPhoto: 'assets/hero.svg', heroAlt: 'Ảnh Dũng',
  groups: {
    friends: { greeting: 'Ê {name}! Ghé lúc {time} nha.', slot: '09:00', skin: 'coffee' },
    elders: { greeting: 'Thưa {name}.', slot: '', skin: 'paper', heroPhoto: 'assets/family.jpg', heroAlt: 'Cả nhà', ...BO },
  },
  people: {
    'minh-k7q2': { group: 'friends', name: 'Minh', heroPhoto: 'assets/p/minh.jpg', heroAlt: 'Dũng và Minh, 2019' },
    'lan-p3x8': { group: 'friends', name: 'Lan' },
    'ba-h2k9': { group: 'elders', name: 'bác Hai' },
    'x-1234': { group: 'nope', name: 'X' },
  },
};

test('US-3 guest opens their personal link', () => {
  assert.deepEqual(resolveGroup('?g=minh-k7q2', pc), {
    group: 'minh-k7q2', greeting: 'Ê Minh! Ghé lúc 09:00 nha.', time: '09:00', skin: 'coffee',
    heroPhoto: 'assets/p/minh.jpg', heroAlt: 'Dũng và Minh, 2019', title: DEFAULT_TITLE, submitLabel: DEFAULT_SUBMIT, ...answers,
  });
});

test('US-3 group time change reaches every person', () => {
  const c = { ...pc, groups: { ...pc.groups, friends: { ...pc.groups.friends, slot: '09:30' } } };
  const r = resolveGroup('?g=minh-k7q2', c);
  assert.equal(r.greeting, 'Ê Minh! Ghé lúc 09:30 nha.');
  assert.equal(r.time, '09:30');
  assert.deepEqual(c.people['minh-k7q2'], pc.people['minh-k7q2']);
});

test('US-3 RSVP group column carries the personal key', () => {
  assert.equal(buildRsvp(resolveGroup('?g=minh-k7q2', pc).group, { name: 'Minh', attending: 'Có' }).group, 'minh-k7q2');
});

test('US-3 person without a photo: group photo, else main photo', () => {
  const lan = resolveGroup('?g=lan-p3x8', pc);
  assert.deepEqual([lan.heroPhoto, lan.heroAlt], ['assets/hero.svg', 'Ảnh Dũng']);
  const hai = resolveGroup('?g=ba-h2k9', pc);
  assert.deepEqual([hai.heroPhoto, hai.heroAlt], ['assets/family.jpg', 'Cả nhà']);
  assert.equal(hai.greeting, 'Thưa bác Hai.');
  assert.equal(hai.skin, 'paper');
  assert.equal(hai.submitLabel, 'Gửi cho Bo');
});

test('US-3 personal key is case-insensitive', () => {
  assert.equal(resolveGroup('?g=MINH-K7Q2', pc).greeting, 'Ê Minh! Ghé lúc 09:00 nha.');
});

test('US-3 person pointing to a missing group gets the neutral page', () => {
  assert.equal(resolveGroup('?g=x-1234', pc).group, 'none');
  for (const search of ['?g=__proto__', '?g=toString', '?g=hasOwnProperty']) assert.equal(resolveGroup(search, pc).group, 'none', search);
});

test('US-3 plain group link: no "{name}" left, neutral word instead', () => {
  const r = resolveGroup('?g=friends', pc);
  assert.equal(r.greeting, `Ê ${NAME_UNSET}! Ghé lúc 09:00 nha.`);
  assert.equal(r.heroPhoto, 'assets/hero.svg');
  for (const g of Object.keys(realContent.groups)) assert.ok(!resolveGroup(`?g=${g}`, realContent).greeting.includes('{name}'), g);
});

test('US-3 name is inserted literally, never re-expanded', () => {
  const c = { groups: { g: { greeting: '{name} lúc {time}', slot: '08:00' } }, people: { 'a-0000': { group: 'g', name: "{time} $& $1" } } };
  assert.equal(resolveGroup('?g=a-0000', c).greeting, '{time} $& $1 lúc 08:00');
});

test('US-3 personal keys: name-xxxx format, at most 20 chars, never a group key', () => {
  const people = realContent.people ?? {};
  for (const k of Object.keys(people)) {
    assert.match(k, /^[a-z0-9]+(-[a-z0-9]+)*-[a-z0-9]{4}$/, k);
    assert.ok(k.length <= 20, k);
    assert.ok(!Object.hasOwn(realContent.groups, k), `collides with group: ${k}`);
    assert.ok(Object.hasOwn(realContent.groups, people[k].group), `unknown group for ${k}`);
  }
});
