// Turns groups.csv + guests.csv (private, in the data dir) into js/people.mjs, assets/p/ and links.csv.
// Usage, from the folder that holds the CSVs and photos/:
//   node <path>/graduation/tools/build-guests.mjs            build
//   node <path>/graduation/tools/build-guests.mjs --remove   after the ceremony: no people, no assets/p/
// Node built-ins only. Every row is checked before anything is written.
import { existsSync, readFileSync, writeFileSync, rmSync, mkdirSync, copyFileSync, statSync } from 'node:fs';
import { join, dirname, resolve } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { randomInt } from 'node:crypto';
import { SKINS } from '../js/logic.mjs';

export const SITE_URL = 'https://joom25.github.io/graduation/';
const MAX_PHOTO = 300 * 1024;
const KEY_RE = /^[a-z0-9]+(-[a-z0-9]+)*-[a-z0-9]{4}$/;
const GROUP_RE = /^[a-z0-9]+(-[a-z0-9]+)*$/;
const PHOTO_RE = /^[A-Za-z0-9][A-Za-z0-9._-]*$/; // a plain file name inside photos/, no folders
const ALPHABET = 'abcdefghijklmnopqrstuvwxyz0123456789';
const skinOk = (s) => s === '' || s === 'coffee' || SKINS.includes(s);
// CSV column -> field name in people.mjs (shared by groups and people).
const FIELDS = { greeting: 'greeting', slot: 'slot', skin: 'skin', title: 'title', submit_label: 'submitLabel', yes_label: 'yesLabel', no_label: 'noLabel' };

// Quote-aware CSV parser (RFC 4180 + Excel's UTF-8 BOM). Returns rows of cells.
export function parseCsv(text) {
  const s = text.replace(/^\uFEFF/, '');
  const rows = [];
  let row = [];
  let cell = '';
  let quoted = false;
  for (let i = 0; i < s.length; i++) {
    const c = s[i];
    if (quoted) {
      if (c === '"' && s[i + 1] === '"') { cell += '"'; i++; }
      else if (c === '"') quoted = false;
      else cell += c;
    } else if (c === '"') quoted = true;
    else if (c === ',') { row.push(cell); cell = ''; }
    else if (c === '\n' || c === '\r') {
      if (c === '\r' && s[i + 1] === '\n') i++;
      row.push(cell); rows.push(row); row = []; cell = '';
    } else cell += c;
  }
  if (cell !== '' || row.length) { row.push(cell); rows.push(row); }
  return rows;
}

// Rows of cells -> CSV text with a BOM, so Excel opens the Vietnamese text as UTF-8.
export function toCsv(rows) {
  const q = (v) => { const t = String(v ?? ''); return /[",\r\n]|^\s|\s$/.test(t) ? `"${t.replaceAll('"', '""')}"` : t; };
  return '\uFEFF' + rows.map((r) => r.map(q).join(',')).join('\r\n') + '\r\n';
}

// Accent-free lowercase call name + '-' + 4 random [a-z0-9], at most 20 chars, not in `taken`.
export function makeKey(callAs, taken, random = randomInt) {
  const slug = String(callAs).normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[đĐ]/g, 'd')
    .toLowerCase().replace(/[^a-z0-9]+/g, '-').slice(0, 15).replace(/^-+|-+$/g, '') || 'khach';
  for (;;) {
    let tail = '';
    for (let i = 0; i < 4; i++) tail += ALPHABET[random(ALPHABET.length)];
    const key = `${slug}-${tail}`;
    if (!taken.has(key)) return key;
  }
}

// CSV text -> { header, records: [{ row, cells, get(col) }] }; blank lines (Excel's trailing ",,,") are skipped.
function table(text) {
  const [head = [], ...rest] = parseCsv(text);
  const header = head.map((h) => h.trim().toLowerCase());
  const records = rest.map((cells, i) => ({ row: i + 2, cells }))
    .filter((r) => r.cells.some((c) => c.trim() !== ''))
    .map((r) => ({ ...r, get: (col) => String(r.cells[header.indexOf(col)] ?? '').trim() }));
  return { header, records };
}

async function load(file) {
  // Query string: a fresh copy each call, so a long-running process (tests) sees the latest file.
  return (await import(pathToFileURL(file).href + '?t=' + Date.now() + Math.random())).default;
}

function writePeople(siteDir, data) {
  const head = '// File này do tools/build-guests.mjs tạo ra. Đừng sửa tay: sửa groups.csv / guests.csv rồi chạy lại (xem SETUP.md).\n';
  writeFileSync(join(siteDir, 'js', 'people.mjs'), `${head}export default ${JSON.stringify(data, null, 2)};\n`);
}

export async function build({ dataDir = process.cwd(), siteDir, remove = false, random = randomInt } = {}) {
  const peopleFile = join(siteDir, 'js', 'people.mjs');
  const photoDir = join(siteDir, 'assets', 'p');

  if (remove) {
    const { groups = {} } = existsSync(peopleFile) ? await load(peopleFile) : {};
    writePeople(siteDir, { groups, people: {} });
    rmSync(photoDir, { recursive: true, force: true });
    return { links: [], warnings: [] };
  }

  const read = (name) => {
    const f = join(dataDir, name);
    if (!existsSync(f)) throw new Error(`Không thấy ${name} trong ${dataDir} / ${name} not found`);
    return table(readFileSync(f, 'utf8'));
  };
  const gt = read('groups.csv');
  const pt = read('guests.csv');
  const siteGroups = (await load(join(siteDir, 'js', 'content.mjs'))).groups ?? {};
  const errors = [];
  const warnings = [];
  const fail = (file, row, msg) => errors.push(`${file} dòng/row ${row}: ${msg}`);

  const groups = {};
  for (const r of gt.records) {
    const key = r.get('group').toLowerCase();
    if (!GROUP_RE.test(key)) { fail('groups.csv', r.row, `group "${key}" phải là chữ thường không dấu / must be a lowercase key`); continue; }
    if (Object.hasOwn(groups, key)) fail('groups.csv', r.row, `group "${key}" bị trùng / duplicate group`);
    if (!r.get('greeting')) fail('groups.csv', r.row, 'thiếu greeting / greeting is empty');
    if (!skinOk(r.get('skin'))) fail('groups.csv', r.row, `skin "${r.get('skin')}" không có / unknown skin`);
    // Only columns the file has: a missing yes_label column keeps content.mjs's value, a blank cell means site default.
    groups[key] = Object.fromEntries(Object.entries(FIELDS).filter(([col]) => gt.header.includes(col)).map(([col, f]) => [f, r.get(col)]));
  }

  const known = (g) => Object.hasOwn(groups, g) || Object.hasOwn(siteGroups, g);
  const taken = new Set([...Object.keys(siteGroups), ...Object.keys(groups)]);
  const guests = pt.records.map((r) => ({ r, key: r.get('key').toLowerCase() }));
  for (const g of guests) {
    if (!g.key) continue;
    if (!KEY_RE.test(g.key) || g.key.length > 20) fail('guests.csv', g.r.row, `key "${g.key}" sai dạng / bad key format`);
    else if (taken.has(g.key)) fail('guests.csv', g.r.row, `key "${g.key}" bị trùng / duplicate key`);
    taken.add(g.key);
  }

  const people = {};
  const copies = [];
  let newKeys = false;
  for (const g of guests) {
    const { r } = g;
    const bad = (msg) => fail('guests.csv', r.row, msg);
    const group = r.get('group').toLowerCase();
    const option = r.get('option').toUpperCase();
    const consent = r.get('photo_ok').toLowerCase() === 'yes';
    const photo = r.get('photo');
    if (!r.get('call_as')) bad('thiếu call_as / call_as is empty');
    if (!known(group)) bad(`group "${group}" không có / unknown group`);
    if (option !== 'B' && option !== 'C') bad(`option "${r.get('option')}" phải là B hoặc C / option must be B or C`);
    if (option === 'C' && !r.get('greeting')) bad('option C cần greeting / option C needs a greeting');
    if (!skinOk(r.get('skin'))) bad(`skin "${r.get('skin')}" không có / unknown skin`);
    if (consent) {
      if (!PHOTO_RE.test(photo)) bad(`tên ảnh "${photo}" không hợp lệ / unsafe photo file name`);
      else if (!existsSync(join(dataDir, 'photos', photo))) bad(`không thấy photos/${photo} / photo file missing`);
      else {
        copies.push(photo);
        if (statSync(join(dataDir, 'photos', photo)).size > MAX_PHOTO) warnings.push(`guests.csv dòng/row ${r.row}: photos/${photo} > 300 KB, nên nén nhỏ lại / consider shrinking it`);
      }
      if (!r.get('photo_alt')) bad('ảnh cần photo_alt / photo needs photo_alt');
    }
    if (!g.key) { g.key = makeKey(r.get('call_as'), taken, random); taken.add(g.key); newKeys = true; }

    // Never the full name or notes: only what the page shows.
    const p = { group, name: r.get('call_as') };
    if (consent) Object.assign(p, { heroPhoto: `assets/p/${photo}`, heroAlt: r.get('photo_alt') });
    for (const [col, f] of Object.entries(FIELDS)) {
      if (col === 'greeting' && option !== 'C') continue; // option B always uses the group's message
      if (r.get(col)) p[f] = r.get(col);
    }
    people[g.key] = p;
  }

  if (errors.length) throw new Error(`Chưa ghi gì cả / nothing written:\n${errors.join('\n')}`);

  writePeople(siteDir, { groups, people });
  // Wiped each build so a withdrawn consent also removes the file.
  rmSync(photoDir, { recursive: true, force: true });
  if (copies.length) mkdirSync(photoDir, { recursive: true });
  for (const photo of copies) copyFileSync(join(dataDir, 'photos', photo), join(photoDir, photo));

  const links = guests.map(({ r, key }) => ({ name: r.get('name'), call_as: r.get('call_as'), link: `${SITE_URL}?g=${key}` }));
  writeFileSync(join(dataDir, 'links.csv'), toCsv([['name', 'call_as', 'link'], ...links.map((l) => [l.name, l.call_as, l.link])]));
  if (newKeys) {
    const header = pt.header.includes('key') ? pt.header : [...pt.header, 'key'];
    const k = header.indexOf('key');
    const rows = guests.map(({ r, key }) => { const c = header.map((_, i) => r.cells[i] ?? ''); c[k] = key; return c; });
    writeFileSync(join(dataDir, 'guests.csv'), toCsv([header, ...rows]));
  }
  return { links, warnings };
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const siteDir = dirname(dirname(fileURLToPath(import.meta.url)));
  const remove = process.argv.includes('--remove');
  try {
    const { links, warnings } = await build({ dataDir: process.cwd(), siteDir, remove });
    for (const w of warnings) console.warn('Cảnh báo / warning: ' + w);
    if (remove) console.log('Đã xoá link riêng và assets/p/. Nhớ commit + push. / Personal entries and assets/p/ removed; commit and push.');
    else {
      for (const l of links) console.log(`${l.call_as}\t${l.link}`);
      console.log(`${links.length} link -> links.csv. Nhớ commit + push. / Commit and push to publish.`);
    }
  } catch (err) {
    console.error(err.message);
    process.exitCode = 1;
  }
}
