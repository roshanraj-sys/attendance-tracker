// ─── ATTENDANCE TRACKER — Apps Script Backend ───────────────────────────────
// Deploy as: Execute as ME, Access: Anyone (even anonymous)
// Sheet tabs required: Members | Attendance | Requests | Config

var SS   = SpreadsheetApp.getActiveSpreadsheet();
var MEMBERS_SH   = function() { return SS.getSheetByName('Members');    };
var ATTENDANCE_SH= function() { return SS.getSheetByName('Attendance'); };
var REQUESTS_SH  = function() { return SS.getSheetByName('Requests');   };
var CONFIG_SH    = function() { return SS.getSheetByName('Config');      };

// ── Router ───────────────────────────────────────────────────────────────────
function doGet(e) {
  var action = (e.parameter && e.parameter.action) ? e.parameter.action : '';
  var result;
  try {
    switch (action) {
      case 'getInitData':       result = getInitData_();                                    break;
      case 'markAttendance':    result = markAttendance_(e.parameter);                      break;
      case 'submitRequest':     result = submitRequest_(e.parameter);                       break;
      case 'getMyRequests':     result = getMyRequests_(e.parameter.name);                  break;
      case 'getAllRequests':     result = getAllRequests_();                                  break;
      case 'updateRequest':     result = updateRequest_(e.parameter.id, e.parameter.status);break;
      case 'getMonthlyReport':  result = getMonthlyReport_(e.parameter);                    break;
      case 'verifyAdmin':       result = verifyAdmin_(e.parameter.password);                break;
      case 'getAbsenceCounts':  result = getAbsenceCounts_();                               break;
      default:                  result = { error: 'Unknown action: ' + action };
    }
  } catch (err) {
    result = { error: err.toString() };
  }
  return ContentService
    .createTextOutput(JSON.stringify(result))
    .setMimeType(ContentService.MimeType.JSON);
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
function getInitData_() {
  var members = sheetRows_(MEMBERS_SH()).map(function(r) {
    return { name: String(r['Name'] || ''), team: String(r['Team'] || '') };
  }).filter(function(m) { return m.name; });

  var today = todayStr_();
  var allAtt = sheetRows_(ATTENDANCE_SH());
  var todayAtt = allAtt.filter(function(r) { return r['Date'] === today; })
    .map(function(r) {
      return { name: r['Name'], team: r['Team'], status: r['Status'], mode: r['Mode'], time: r['Time'] };
    });

  // Count all-time absences per member
  var absCounts = {};
  allAtt.forEach(function(r) {
    if (r['Status'] === 'Absent') {
      absCounts[r['Name']] = (absCounts[r['Name']] || 0) + 1;
    }
  });

  return { members: members, todayAttendance: todayAtt, absenceCounts: absCounts };
}

// ── markAttendance ────────────────────────────────────────────────────────────
function markAttendance_(p) {
  var name = p.name || '';
  var mode = p.mode || 'WFO';
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

  sh.appendRow([today, name, member['Team'] || '', 'Present', mode, nowTime_()]);
  return { success: true, time: nowTime_(), mode: mode };
}

// ── submitRequest ─────────────────────────────────────────────────────────────
function submitRequest_(p) {
  var name = p.name || '';
  if (!name) return { error: 'Name required.' };

  var mRows = sheetRows_(MEMBERS_SH());
  var member = mRows.filter(function(r) { return r['Name'] === name; })[0] || {};
  var id = genId_();

  REQUESTS_SH().appendRow([
    id, name, member['Team'] || '',
    p.type || '',         // Leave | Overtime
    p.subtype || '',      // Sick / Casual / Planned / Emergency  OR  hours for OT
    p.from_ || '',        // from date
    p.to_ || '',          // to date (leave)
    p.date_ || '',        // single date (OT)
    p.hours || '',        // OT hours
    p.reason || '',
    'Pending',
    todayStr_()
  ]);
  return { success: true, id: id };
}

// ── getMyRequests ─────────────────────────────────────────────────────────────
function getMyRequests_(name) {
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
function getAllRequests_() {
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
function updateRequest_(id, status) {
  if (!id || !status) return { error: 'id and status required.' };
  var sh = REQUESTS_SH();
  var data = sh.getDataRange().getValues();
  var headers = data[0];
  var idCol = headers.indexOf('ID');
  var statusCol = headers.indexOf('Status');
  for (var i = 1; i < data.length; i++) {
    if (data[i][idCol] === id) {
      sh.getRange(i + 1, statusCol + 1).setValue(status);
      return { success: true };
    }
  }
  return { error: 'Request not found: ' + id };
}

// ── verifyAdmin ───────────────────────────────────────────────────────────────
function verifyAdmin_(password) {
  var rows = sheetRows_(CONFIG_SH());
  var row = rows.filter(function(r) { return r['Key'] === 'admin_password'; })[0];
  var stored = row ? String(row['Value']) : 'admin123';
  return { valid: password === stored };
}

// ── getAbsenceCounts ──────────────────────────────────────────────────────────
function getAbsenceCounts_() {
  var counts = {};
  sheetRows_(ATTENDANCE_SH()).forEach(function(r) {
    if (r['Status'] === 'Absent') {
      counts[r['Name']] = (counts[r['Name']] || 0) + 1;
    }
  });
  return { counts: counts };
}

// ── getMonthlyReport ──────────────────────────────────────────────────────────
function getMonthlyReport_(p) {
  var month = parseInt(p.month) || new Date().getMonth() + 1;
  var year  = parseInt(p.year)  || new Date().getFullYear();
  var team  = p.team || 'All';

  // Period: 15th of prev month → 15th of this month
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
    var mAtt  = allAtt.filter(function(r) { return r['Name']===m.name && r['Date']>=from && r['Date']<=to; });
    var presents = mAtt.filter(function(r) { return r['Status']==='Present'; }).length;
    var absences = mAtt.filter(function(r) { return r['Status']==='Absent';  }).length;

    var mReqs = allReqs.filter(function(r) { return r['Name']===m.name; });
    var leaves = mReqs.filter(function(r) {
      return r['Type']==='Leave' && r['From']>=from && r['To']<=to;
    });
    var leaveDays = leaves.reduce(function(s, r) {
      var d1=new Date(r['From']), d2=new Date(r['To']);
      return s + Math.round((d2-d1)/86400000) + 1;
    }, 0);
    var otHours = mReqs.filter(function(r) {
      return r['Type']==='Overtime' && r['Date']>=from && r['Date']<=to;
    }).reduce(function(s, r) { return s + (parseInt(r['Hours'])||0); }, 0);

    var workDays = mAtt.length || 1;
    var attPct   = Math.round((presents / workDays) * 100);

    return { name:m.name, team:m.team, presents:presents, absences:absences, leaveDays:leaveDays, otHours:otHours, attPct:attPct };
  });

  return { rows: rows, from: from, to: to, memberCount: members.length };
}

function pad_(n) { return n < 10 ? '0'+n : ''+n; }

// ── Sheet Setup Helper (run once manually) ────────────────────────────────────
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

  SpreadsheetApp.getUi().alert('Sheets setup complete!');
}
