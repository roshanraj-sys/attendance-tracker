// ─── ATTENDANCE TRACKER — Apps Script Backend ───────────────────────────────
// Deploy as: Execute as ME, Access: Anyone within instamart.in
// This file also SERVES the HTML via doGet()

var SS = SpreadsheetApp.getActiveSpreadsheet();
function MEMBERS_SH()    { return SS.getSheetByName('Members');    }
function ATTENDANCE_SH() { return SS.getSheetByName('Attendance'); }
function REQUESTS_SH()   { return SS.getSheetByName('Requests');   }
function CONFIG_SH()     { return SS.getSheetByName('Config');     }

// ── Serve HTML ────────────────────────────────────────────────────────────────
function doGet(e) {
  return HtmlService.createHtmlOutputFromFile('dashboard')
    .setTitle('Team Attendance Tracker')
    .setXFrameOptionsMode(HtmlService.XFrameOptionsMode.ALLOWALL);
}

// ── Helpers ───────────────────────────────────────────────────────────────────
function todayStr_() {
  return Utilities.formatDate(new Date(), Session.getScriptTimeZone(), 'yyyy-MM-dd');
}
function nowTime_() {
  return Utilities.formatDate(new Date(), Session.getScriptTimeZone(), 'hh:mm a');
}
function genId_() {
  return Utilities.getUuid().slice(0, 8).toUpperCase();
}
function sheetRows_(sheet) {
  var data = sheet.getDataRange().getValues();
  if (data.length <= 1) return [];
  var headers = data[0];
  return data.slice(1).map(function(row) {
    var obj = {};
    headers.forEach(function(h, i) { obj[h] = row[i]; });
    return obj;
  });
}

// ── getInitData ───────────────────────────────────────────────────────────────
function getInitData() {
  var members = sheetRows_(MEMBERS_SH()).map(function(r) {
    return { name: String(r['Name'] || ''), team: String(r['Team'] || '') };
  }).filter(function(m) { return m.name; });

  var today = todayStr_();
  var allAtt = sheetRows_(ATTENDANCE_SH());
  var todayAtt = allAtt.filter(function(r) { return r['Date'] === today; })
    .map(function(r) {
      return { name: r['Name'], team: r['Team'], status: r['Status'], mode: r['Mode'], time: r['Time'] };
    });

  var absCounts = {};
  allAtt.forEach(function(r) {
    if (r['Status'] === 'Absent') {
      absCounts[r['Name']] = (absCounts[r['Name']] || 0) + 1;
    }
  });

  return { members: members, todayAttendance: todayAtt, absenceCounts: absCounts };
}

// ── markAttendance ────────────────────────────────────────────────────────────
function markAttendance(name, mode) {
  var today = todayStr_();
  if (!name) return { error: 'Name is required.' };

  var sh = ATTENDANCE_SH();
  var rows = sheetRows_(sh);
  var existing = rows.filter(function(r) { return r['Date'] === today && r['Name'] === name; });
  if (existing.length) {
    return { alreadyCheckedIn: true, time: existing[0]['Time'], mode: existing[0]['Mode'] };
  }

  var mRows = sheetRows_(MEMBERS_SH());
  var member = mRows.filter(function(r) { return r['Name'] === name; })[0] || {};
  sh.appendRow([today, name, member['Team'] || '', 'Present', mode || 'WFO', nowTime_()]);
  return { success: true, time: nowTime_(), mode: mode };
}

// ── submitRequest ─────────────────────────────────────────────────────────────
function submitRequest(params) {
  var name = params.name || '';
  if (!name) return { error: 'Name required.' };

  var mRows = sheetRows_(MEMBERS_SH());
  var member = mRows.filter(function(r) { return r['Name'] === name; })[0] || {};
  var id = genId_();

  REQUESTS_SH().appendRow([
    id, name, member['Team'] || '',
    params.type || '',
    params.subtype || '',
    params.from_ || '',
    params.to_ || '',
    params.date_ || '',
    params.hours || '',
    params.reason || '',
    'Pending',
    todayStr_()
  ]);
  return { success: true, id: id };
}

// ── getMyRequests ─────────────────────────────────────────────────────────────
function getMyRequests(name) {
  if (!name) return { requests: [] };
  var rows = sheetRows_(REQUESTS_SH()).filter(function(r) { return r['Name'] === name; });
  return {
    requests: rows.map(function(r) {
      return {
        id: r['ID'], name: r['Name'], team: r['Team'],
        type: r['Type'], subtype: r['Subtype'],
        from: r['From'], to: r['To'], date: r['Date'], hours: r['Hours'],
        reason: r['Reason'], status: r['Status'], submittedOn: r['SubmittedOn']
      };
    }).reverse()
  };
}

// ── getAllRequests ─────────────────────────────────────────────────────────────
function getAllRequests() {
  var rows = sheetRows_(REQUESTS_SH());
  return {
    requests: rows.map(function(r) {
      return {
        id: r['ID'], name: r['Name'], team: r['Team'],
        type: r['Type'], subtype: r['Subtype'],
        from: r['From'], to: r['To'], date: r['Date'], hours: r['Hours'],
        reason: r['Reason'], status: r['Status'], submittedOn: r['SubmittedOn']
      };
    }).reverse()
  };
}

// ── updateRequest ─────────────────────────────────────────────────────────────
function updateRequest(id, status) {
  if (!id || !status) return { error: 'id and status required.' };
  var sh = REQUESTS_SH();
  var data = sh.getDataRange().getValues();
  var headers = data[0];
  var idCol = headers.indexOf('ID');
  var statusCol = headers.indexOf('Status');
  for (var i = 1; i < data.length; i++) {
    if (String(data[i][idCol]) === String(id)) {
      sh.getRange(i + 1, statusCol + 1).setValue(status);
      return { success: true };
    }
  }
  return { error: 'Request not found: ' + id };
}

// ── verifyAdmin ───────────────────────────────────────────────────────────────
function verifyAdmin(password) {
  var rows = sheetRows_(CONFIG_SH());
  var row = rows.filter(function(r) { return r['Key'] === 'admin_password'; })[0];
  var stored = row ? String(row['Value']) : 'admin123';
  return { valid: password === stored };
}

// ── getMonthlyReport ──────────────────────────────────────────────────────────
function getMonthlyReport(month, year, team) {
  month = parseInt(month) || (new Date().getMonth() + 1);
  year  = parseInt(year)  || new Date().getFullYear();
  team  = team || 'All';

  var fromMonth = month === 1 ? 12 : month - 1;
  var fromYear  = month === 1 ? year - 1 : year;
  var from = fromYear + '-' + pad_(fromMonth) + '-15';
  var to   = year     + '-' + pad_(month)     + '-15';

  var members = sheetRows_(MEMBERS_SH())
    .map(function(r) { return { name: String(r['Name']||''), team: String(r['Team']||'') }; })
    .filter(function(m) { return m.name && (team === 'All' || m.team === team); });

  var allAtt  = sheetRows_(ATTENDANCE_SH());
  var allReqs = sheetRows_(REQUESTS_SH()).filter(function(r) { return r['Status'] === 'Approved'; });

  var rows = members.map(function(m) {
    var mAtt     = allAtt.filter(function(r) { return r['Name']===m.name && r['Date']>=from && r['Date']<=to; });
    var presents = mAtt.filter(function(r) { return r['Status']==='Present'; }).length;
    var absences = mAtt.filter(function(r) { return r['Status']==='Absent';  }).length;
    var mReqs    = allReqs.filter(function(r) { return r['Name']===m.name; });

    var leaveDays = mReqs.filter(function(r) { return r['Type']==='Leave' && r['From']>=from && r['To']<=to; })
      .reduce(function(s, r) {
        var d1=new Date(r['From']), d2=new Date(r['To']);
        return s + Math.round((d2-d1)/86400000) + 1;
      }, 0);

    var otHours = mReqs.filter(function(r) { return r['Type']==='Overtime' && r['Date']>=from && r['Date']<=to; })
      .reduce(function(s, r) { return s + (parseInt(r['Hours'])||0); }, 0);

    var workDays = mAtt.length || 1;
    var attPct   = Math.round((presents / workDays) * 100);

    return { name:m.name, team:m.team, presents:presents, absences:absences, leaveDays:leaveDays, otHours:otHours, attPct:attPct };
  });

  return { rows: rows, from: from, to: to, memberCount: members.length };
}

function pad_(n) { return n < 10 ? '0'+n : ''+n; }

// ── Sheet Setup Helper — run once manually ────────────────────────────────────
function setupSheets() {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  function ensureSheet(name, headers) {
    var sh = ss.getSheetByName(name);
    if (!sh) sh = ss.insertSheet(name);
    if (sh.getLastRow() === 0) sh.appendRow(headers);
    return sh;
  }
  ensureSheet('Members',    ['Name', 'Team']);
  ensureSheet('Attendance', ['Date', 'Name', 'Team', 'Status', 'Mode', 'Time']);
  ensureSheet('Requests',   ['ID', 'Name', 'Team', 'Type', 'Subtype', 'From', 'To', 'Date', 'Hours', 'Reason', 'Status', 'SubmittedOn']);
  var cfg = ensureSheet('Config', ['Key', 'Value']);
  if (cfg.getLastRow() < 2) cfg.appendRow(['admin_password', 'admin123']);
  SpreadsheetApp.getUi().alert('Sheets setup complete! Default admin password: admin123');
}
