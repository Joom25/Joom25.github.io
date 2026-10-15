import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import vm from 'node:vm';
import { buildRsvp } from '../js/logic.mjs';

const source = readFileSync(new URL('../apps-script/Code.gs', import.meta.url), 'utf8');

// Loads Code.gs with stub Apps Script globals; returns a doPost(payload) helper and the sheet rows.
function load() {
  const rows = [];
  // Copy rows out of the vm realm so deepEqual compares by value.
  const sheet = { getLastRow: () => rows.length, appendRow: (r) => rows.push([...r]) };
  const ctx = vm.createContext({
    SpreadsheetApp: { getActiveSpreadsheet: () => ({ getSheets: () => [sheet] }) },
    LockService: { getScriptLock: () => ({ waitLock() {}, releaseLock() {} }) },
    ContentService: {
      MimeType: { JSON: 'json' },
      createTextOutput: (text) => ({ setMimeType: () => JSON.parse(text) }),
    },
  });
  vm.runInContext(source, ctx);
  const post = (payload) => ctx.doPost({ postData: { contents: JSON.stringify(payload) } });
  return { post, rows };
}

test('Code.gs: header once, row order, guest strings prefixed with quote', () => {
  const { post, rows } = load();
  assert.deepEqual(post(buildRsvp('family', { name: '0123', attending: 'Có', message: '08:00' })), { ok: true });
  assert.deepEqual(post(buildRsvp('friends', { name: '=1+1', attending: 'Không', message: '' })), { ok: true });
  assert.equal(rows.length, 3);
  assert.deepEqual(rows[0], ['Thời gian', 'Nhóm', 'Tên', 'Tham dự', 'Lời nhắn']);
  assert.ok(rows[1][0] instanceof Date || Object.prototype.toString.call(rows[1][0]) === '[object Date]');
  assert.deepEqual(rows[1].slice(1), ["'family", "'0123", "'Có", "'08:00"]);
  assert.deepEqual(rows[2].slice(1), ["'friends", "'=1+1", "'Không", '']);
});

test('Code.gs: blank name returns ok:false and appends nothing', () => {
  const { post, rows } = load();
  assert.equal(post(buildRsvp('family', { name: '   ', attending: 'Có' })).ok, false);
  assert.equal(rows.length, 0);
});

test('Code.gs: text capped to max length', () => {
  const { post, rows } = load();
  post(buildRsvp('g'.repeat(50), { name: 'n'.repeat(100), attending: 'a'.repeat(30), message: 'm'.repeat(900) }));
  assert.deepEqual([...rows[1].slice(1).map((s) => s.length - 1)], [20, 60, 10, 500]);
});
