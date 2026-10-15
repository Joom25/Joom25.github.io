// RSVP receiver. Paste into the Sheet's Extensions > Apps Script, then deploy as a web app
// (Execute as: Me, Who has access: Anyone). See ../SETUP.md.

const HEADERS = ['Thời gian', 'Nhóm', 'Tên', 'Tham dự', 'Lời nhắn'];

function doPost(e) {
  try {
    const data = JSON.parse(e.postData.contents);
    const name = clean(data.name, 60);
    if (!name) return reply({ ok: false, error: 'name required' });

    const lock = LockService.getScriptLock();
    lock.waitLock(10000);
    try {
      const sheet = SpreadsheetApp.getActiveSpreadsheet().getSheets()[0];
      if (sheet.getLastRow() === 0) sheet.appendRow(HEADERS);
      sheet.appendRow([new Date(), clean(data.group, 20), name, clean(data.attending, 10), clean(data.message, 500)]);
    } finally {
      lock.releaseLock();
    }
    return reply({ ok: true });
  } catch (err) {
    return reply({ ok: false, error: String(err) });
  }
}

// Trim and cap length; the leading ' keeps Sheets from reading guest text as a formula, number or time.
function clean(value, max) {
  const s = String(value == null ? '' : value).trim().slice(0, max);
  return s ? "'" + s : s;
}

function reply(obj) {
  return ContentService.createTextOutput(JSON.stringify(obj)).setMimeType(ContentService.MimeType.JSON);
}
