import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, mkdirSync, writeFileSync, readFileSync, existsSync, readdirSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { pathToFileURL } from 'node:url';
import { parseCsv, toCsv, makeKey, build, SITE_URL } from '../tools/build-guests.mjs';
import { resolveGroup, withGuests } from '../js/logic.mjs';

const GROUPS = 'group,greeting,slot,skin,title,submit_label\r\n'
  + 'friends,"Ê {name}! Ghé lúc {time} nha, nhé ☕",09:00,coffee,,\r\n'
  + 'elders,Thưa {name}.,07:30,paper,,Con sẽ đến\r\n';
const HEAD = 'name,call_as,group,option,photo,photo_alt,photo_ok,slot,greeting,skin,title,submit_label,notes\r\n';

// A temp data dir + site dir; `guests` is the guests.csv body (rows after HEAD).
function setup(guests, { groups = GROUPS, photos = {} } = {}) {
  const root = mkdtempSync(join(tmpdir(), 'guests-'));
  const dataDir = join(root, 'data');
  const siteDir = join(root, 'site');
  mkdirSync(join(dataDir, 'photos'), { recursive: true });
  mkdirSync(join(siteDir, 'js'), { recursive: true });
  writeFileSync(join(siteDir, 'js', 'content.mjs'), "export default { groups: { family: { greeting: 'f' }, elders: { greeting: 'old', yesLabel: 'Bo yes' } } };\n");
  writeFileSync(join(siteDir, 'js', 'people.mjs'), 'export default { groups: {}, people: {} };\n');
  writeFileSync(join(dataDir, 'groups.csv'), groups);
  writeFileSync(join(dataDir, 'guests.csv'), '\uFEFF' + HEAD + guests);
  for (const [name, size] of Object.entries(photos)) writeFileSync(join(dataDir, 'photos', name), Buffer.alloc(size));
  return { dataDir, siteDir };
}
const seq = () => { let i = 0; return () => i++ % 36; }; // keys: x-abcd, x-efgh, ...
const load = async (siteDir) => (await import(pathToFileURL(join(siteDir, 'js', 'people.mjs')).href + '?' + Math.random())).default;
const MINH = 'Nguyễn Văn Minh,Minh,friends,B,minh.jpg,"Dũng và Minh, 2019",yes,,,,,,send via Zalo\r\n';

test('parseCsv: BOM, quotes, "", commas, newlines, CRLF, emoji, accents', () => {
  const text = '\uFEFFa,b,c\r\n"x, y","say ""hi""","line1\nline2 🎓"\r\nĐà Lạt,,\n';
  assert.deepEqual(parseCsv(text), [['a', 'b', 'c'], ['x, y', 'say "hi"', 'line1\nline2 🎓'], ['Đà Lạt', '', '']]);
  assert.deepEqual(parseCsv('a,b'), [['a', 'b']]);
});

test('toCsv round-trips through parseCsv', () => {
  const rows = [['k', 'v'], ['x, y', 'say "hi"\nok'], [' pad', '']];
  assert.deepEqual(parseCsv(toCsv(rows)), rows);
});

test('makeKey: accent-free, đ -> d, 4 random chars, at most 20, unique', () => {
  assert.equal(makeKey('Minh', new Set(), seq()), 'minh-abcd');
  assert.equal(makeKey('Đức', new Set(), seq()), 'duc-abcd');
  assert.equal(makeKey('chị Hai', new Set(['chi-hai-abcd']), seq()), 'chi-hai-efgh');
  const long = makeKey('Nguyễn Thị Thanh Hương Lan', new Set());
  assert.match(long, /^[a-z0-9]+(-[a-z0-9]+)*-[a-z0-9]{4}$/);
  assert.ok(long.length <= 20, long);
  assert.match(makeKey('🎓', new Set()), /^khach-[a-z0-9]{4}$/);
});

test('build: people.mjs, links.csv, keys written back, groups from CSV', async () => {
  const { dataDir, siteDir } = setup(MINH + 'Huỳnh Thị B,chị Hai,elders,C,,,asking,07:45,"Chị Hai ơi, đến lúc {time} nha 💜",cotton,,,\r\n', { photos: { 'minh.jpg': 10 } });
  const { links, warnings } = await build({ dataDir, siteDir, random: seq() });
  assert.deepEqual(warnings, []);
  const data = await load(siteDir);
  assert.deepEqual(Object.keys(data.people), ['minh-abcd', 'chi-hai-efgh']);
  assert.deepEqual(data.people['minh-abcd'], { group: 'friends', name: 'Minh', heroPhoto: 'assets/p/minh.jpg', heroAlt: 'Dũng và Minh, 2019' });
  assert.deepEqual(data.people['chi-hai-efgh'], { group: 'elders', name: 'chị Hai', slot: '07:45', greeting: 'Chị Hai ơi, đến lúc {time} nha 💜', skin: 'cotton' });
  assert.deepEqual(data.groups.friends, { greeting: 'Ê {name}! Ghé lúc {time} nha, nhé ☕', slot: '09:00', skin: 'coffee', title: '', submitLabel: '' });
  const people = readFileSync(join(siteDir, 'js', 'people.mjs'), 'utf8');
  assert.ok(!people.includes('Nguyễn Văn Minh') && !people.includes('Zalo'), 'no full name or notes');
  assert.ok(existsSync(join(siteDir, 'assets', 'p', 'minh.jpg')));
  assert.deepEqual(links.map((l) => l.link), [`${SITE_URL}?g=minh-abcd`, `${SITE_URL}?g=chi-hai-efgh`]);
  assert.deepEqual(parseCsv(readFileSync(join(dataDir, 'links.csv'), 'utf8'))[1], ['Nguyễn Văn Minh', 'Minh', `${SITE_URL}?g=minh-abcd`]);
  const back = parseCsv(readFileSync(join(dataDir, 'guests.csv'), 'utf8'));
  assert.equal(back[0].at(-1), 'key');
  assert.deepEqual(back.slice(1).map((r) => r.at(-1)), ['minh-abcd', 'chi-hai-efgh']);
  assert.equal(back[1][12], 'send via Zalo');

  // The page: personal link, overrides, CSV group values over content.mjs, fields the CSV lacks survive.
  const site = withGuests({ groups: { elders: { greeting: 'old', yesLabel: 'Bo yes' } } }, data);
  assert.equal(resolveGroup('?g=MINH-ABCD', site).greeting, 'Ê Minh! Ghé lúc 09:00 nha, nhé ☕');
  const hai = resolveGroup('?g=chi-hai-efgh', site);
  assert.deepEqual([hai.greeting, hai.skin, hai.time, hai.submitLabel, hai.yesLabel], ['Chị Hai ơi, đến lúc 07:45 nha 💜', 'cotton', '07:45', 'Con sẽ đến', 'Bo yes']);
  assert.equal(resolveGroup('?g=elders', site).greeting, 'Thưa bạn.');
});

test('build: existing keys are reused, a second run changes nothing', async () => {
  const { dataDir, siteDir } = setup(MINH, { photos: { 'minh.jpg': 10 } });
  await build({ dataDir, siteDir, random: seq() });
  const first = readFileSync(join(dataDir, 'guests.csv'), 'utf8');
  writeFileSync(join(dataDir, 'guests.csv'), first.replace('send via Zalo', 'edited'));
  await build({ dataDir, siteDir });
  assert.deepEqual(Object.keys((await load(siteDir)).people), ['minh-abcd']);
  assert.match(readFileSync(join(dataDir, 'guests.csv'), 'utf8'), /edited/);
});

test('build: no consent means no photo and no copied file; a withdrawn consent removes the file', async () => {
  const { dataDir, siteDir } = setup(MINH, { photos: { 'minh.jpg': 10 } });
  await build({ dataDir, siteDir, random: seq() });
  assert.ok(existsSync(join(siteDir, 'assets', 'p', 'minh.jpg')));
  for (const ok of ['no', 'asking']) {
    writeFileSync(join(dataDir, 'guests.csv'), '\uFEFF' + HEAD + MINH.replace(',yes,', `,${ok},`));
    await build({ dataDir, siteDir, random: seq() });
    const p = Object.values((await load(siteDir)).people)[0];
    assert.equal(p.heroPhoto, undefined, ok);
    assert.ok(!existsSync(join(siteDir, 'assets', 'p', 'minh.jpg')), ok);
  }
});

test('build: consented photo over 300 KB is copied with a warning', async () => {
  const { dataDir, siteDir } = setup(MINH, { photos: { 'minh.jpg': 301 * 1024 } });
  const { warnings } = await build({ dataDir, siteDir, random: seq() });
  assert.equal(warnings.length, 1);
  assert.match(warnings[0], /row 2.*300 KB/);
  assert.ok(existsSync(join(siteDir, 'assets', 'p', 'minh.jpg')));
});

test('build: every bad row stops the build, names the row, writes nothing', async () => {
  const cases = {
    'unknown group': MINH.replace(',friends,', ',nope,'),
    'call_as is empty': MINH.replace(',Minh,', ',,'),
    'option C needs a greeting': MINH.replace(',B,', ',C,'),
    'photo file missing': MINH.replace('minh.jpg', 'other.jpg'),
    'unknown skin': MINH.replace(',,,,,,send', ',,,moon,,,send'),
    'option must be B or C': MINH.replace(',B,', ',A,'),
    'photo needs photo_alt': MINH.replace('"Dũng và Minh, 2019"', ''),
    'unsafe photo file name': MINH.replace('minh.jpg', '../minh.jpg'),
    'duplicate key': MINH.replace(/\r\n$/, ',minh-abcd\r\n').repeat(2),
    'slot must be HH:MM': MINH.replace(',yes,,', ',yes,7h30,'),
    'photo is empty': MINH.replace('minh.jpg', ''),
    'photo must be .jpg': MINH.replace('minh.jpg', 'minh.heic'),
  };
  for (const [problem, guests] of Object.entries(cases)) {
    const { dataDir, siteDir } = setup(guests, { photos: { 'minh.jpg': 10 } });
    if (problem === 'duplicate key') writeFileSync(join(dataDir, 'guests.csv'), '\uFEFF' + HEAD.replace('\r\n', ',key\r\n') + guests);
    const before = readFileSync(join(dataDir, 'guests.csv'), 'utf8');
    await assert.rejects(build({ dataDir, siteDir, random: seq() }), (err) => {
      assert.match(err.message, new RegExp(`row \\d+: .*${problem.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}`), problem);
      return true;
    }, problem);
    assert.equal(readFileSync(join(siteDir, 'js', 'people.mjs'), 'utf8'), 'export default { groups: {}, people: {} };\n', problem);
    assert.equal(readFileSync(join(dataDir, 'guests.csv'), 'utf8'), before, problem);
    assert.ok(!existsSync(join(dataDir, 'links.csv')) && !existsSync(join(siteDir, 'assets', 'p')), problem);
  }
});

test('build: bad slot in groups.csv stops the build; 24:00 is not a time', async () => {
  for (const slot of ['7h30', '24:00', '7:30']) {
    const { dataDir, siteDir } = setup(MINH, { groups: GROUPS.replace(',09:00,', `,${slot},`), photos: { 'minh.jpg': 10 } });
    await assert.rejects(build({ dataDir, siteDir }), /groups\.csv .*row 2: .*slot must be HH:MM/, slot);
  }
});

test('build: missing required columns stop the build', async () => {
  const { dataDir, siteDir } = setup(MINH, { photos: { 'minh.jpg': 10 } });
  writeFileSync(join(dataDir, 'guests.csv'), HEAD.replace('photo_ok', 'photook') + MINH);
  await assert.rejects(build({ dataDir, siteDir }), /guests\.csv: .*missing columns: photo_ok/);
  writeFileSync(join(dataDir, 'groups.csv'), 'group,slot\r\nfriends,09:00\r\n');
  await assert.rejects(build({ dataDir, siteDir }), /groups\.csv: .*missing columns: greeting/);
});

test('build: a CSV not saved as UTF-8 stops the build', async () => {
  const { dataDir, siteDir } = setup(MINH, { photos: { 'minh.jpg': 10 } });
  writeFileSync(join(dataDir, 'guests.csv'), Buffer.concat([Buffer.from(HEAD), Buffer.from([0x4e, 0x67, 0x75, 0x79, 0xe3, 0x6e]), Buffer.from(',Minh,friends,B,,,no\r\n')]));
  await assert.rejects(build({ dataDir, siteDir }), /guests\.csv: .*CSV UTF-8/);
  assert.ok(!existsSync(join(dataDir, 'links.csv')));
});

test('parseCsv: an unterminated quote throws instead of swallowing rows', () => {
  assert.throws(() => parseCsv('a,b\r\n"x,y\r\nc,d\r\n'), /unterminated quote/);
});

test('build: option B ignores its greeting cell and uses the group greeting', async () => {
  const { dataDir, siteDir } = setup(MINH.replace(',yes,,,', ',yes,,Riêng cho Minh,'), { photos: { 'minh.jpg': 10 } });
  await build({ dataDir, siteDir, random: seq() });
  const data = await load(siteDir);
  assert.equal(data.people['minh-abcd'].greeting, undefined);
  assert.equal(resolveGroup('?g=minh-abcd', withGuests({ groups: {} }, data)).greeting, 'Ê Minh! Ghé lúc 09:00 nha, nhé ☕');
});

test('build: key write-back keeps the original header text and every cell', async () => {
  const { dataDir, siteDir } = setup('', { photos: { 'minh.jpg': 10 } });
  writeFileSync(join(dataDir, 'guests.csv'), HEAD.replace('notes', ' Notes ').replace('\r\n', ',Extra\r\n') + MINH.replace('\r\n', ',x,spill\r\n'));
  await build({ dataDir, siteDir, random: seq() });
  const back = parseCsv(readFileSync(join(dataDir, 'guests.csv'), 'utf8'));
  // The row has one cell more than the header: it is kept, and key goes after it.
  assert.deepEqual(back[0].slice(12), [' Notes ', 'Extra', '', 'key']);
  assert.deepEqual(back[1].slice(12), ['send via Zalo', 'x', 'spill', 'minh-abcd']);
});

test('build: unknown skin in groups.csv stops the build', async () => {
  const { dataDir, siteDir } = setup(MINH, { groups: GROUPS.replace(',paper,', ',moon,'), photos: { 'minh.jpg': 10 } });
  await assert.rejects(build({ dataDir, siteDir }), /groups\.csv .*row 3: .*unknown skin/);
});

test('build --remove: people emptied, assets/p gone, CSV groups kept', async () => {
  const { dataDir, siteDir } = setup(MINH, { photos: { 'minh.jpg': 10 } });
  await build({ dataDir, siteDir, random: seq() });
  await build({ dataDir: join(dataDir, 'nowhere'), siteDir, remove: true });
  const data = await load(siteDir);
  assert.deepEqual(data.people, {});
  assert.equal(data.groups.friends.slot, '09:00');
  assert.ok(!existsSync(join(siteDir, 'assets', 'p')));
  const site = withGuests({ groups: {} }, data);
  assert.equal(resolveGroup('?g=minh-abcd', site).group, 'none');
  assert.equal(resolveGroup('?g=friends', site).group, 'friends');
  assert.deepEqual(readdirSync(join(siteDir, 'js')).sort(), ['content.mjs', 'people.mjs']);
});
