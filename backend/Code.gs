/**
 * ============================================================================
 *  Uttar Pradesh Police — District Lucknow (North)
 *  Police Station Malihabad (थाना मलिहाबाद) — Duty Management System
 *  Google Apps Script Cloud Database Backend (Code.gs)
 * ============================================================================
 *
 *  Deploy Instructions:
 *  1. Go to https://script.google.com/ and create a "New project".
 *  2. Name it "PS Malihabad Duty Backend".
 *  3. Paste this entire Code.gs file into the editor, replacing any existing code.
 *  4. Click "Deploy" > "New deployment".
 *  5. Select type: "Web app".
 *     - Description: "PS Malihabad Duty Backend v1"
 *     - Execute as: "Me" (your email)
 *     - Who has access: "Anyone"
 *  6. Click "Deploy", authorize the permissions for Google Drive, and copy the Web App URL (ends with /exec).
 *  7. Paste that URL into js/config.js as API_URL.
 */

var DB_FOLDER_NAME = "PS_Malihabad_Duty_Database";
var ROLES = { admin: 3, editor: 2, viewer: 1 };
var OWNER_EMAIL = "admin.malihabad@uppolice.gov.in"; // Default owner; will be updated with your Google account

var HEAD = {
  login: ["Timestamp", "Email", "Name", "Event", "Result", "Session", "Browser", "IP", "Details"],
  activity: ["Timestamp", "Email", "Name", "Role", "Module", "Action", "Record", "Old Value", "New Value", "Result", "Session"],
  error: ["Timestamp", "Email", "Module", "Operation", "Error", "Stack / Details", "Browser", "Status"]
};

// ============================================================================
// HTTP Handlers
// ============================================================================

function doGet(e) {
  return ContentService.createTextOutput(JSON.stringify({
    ok: true,
    service: "UP Police — PS Malihabad Duty Management Cloud Backend",
    district: "Lucknow North",
    time: stamp(),
    status: "online"
  })).setMimeType(ContentService.MimeType.JSON);
}

function doPost(e) {
  var lock = LockService.getScriptLock();
  try {
    lock.waitLock(15000);
  } catch (err) {
    return makeResponse(false, null, "Server is busy. Please try again in a moment.", "SERVER_BUSY");
  }

  try {
    var raw = e && e.postData && e.postData.contents;
    if (!raw) return makeResponse(false, null, "Empty request body.", "BAD_REQUEST");

    var req = JSON.parse(raw);
    var action = req.action;
    var payload = req.payload || {};
    var sessionToken = req.session;
    var client = req.client || {};

    var res = handleAction(action, payload, sessionToken, client);
    return makeResponse(true, res);
  } catch (err) {
    return makeResponse(false, null, err.message || "Unknown error", err.code || "SERVER_ERROR");
  } finally {
    lock.releaseLock();
  }
}

function makeResponse(ok, data, errorMsg, errorCode) {
  var out = { ok: ok };
  if (ok) {
    out.data = data;
  } else {
    out.error = errorMsg;
    out.code = errorCode || "SERVER_ERROR";
  }
  return ContentService.createTextOutput(JSON.stringify(out))
    .setMimeType(ContentService.MimeType.JSON);
}

// ============================================================================
// Action Router & Handlers
// ============================================================================

function handleAction(action, payload, sessionToken, client) {
  var db = loadDatabase();
  var ctx = null;

  // 1. Ping / Health check
  if (action === "ping") return { pong: true, time: stamp() };

  // 2. Google OAuth ID Token Login
  if (action === "auth.login") {
    var userEmail = "";
    var userName = "";

    if (payload.idToken) {
      // Verify Google OAuth Token with Google API
      var verifyUrl = "https://oauth2.googleapis.com/tokeninfo?id_token=" + encodeURIComponent(payload.idToken);
      var resp = UrlFetchApp.fetch(verifyUrl, { muteHttpExceptions: true });
      if (resp.getResponseCode() !== 200) {
        throw createError("Invalid Google Sign-In token.", "AUTH_FAILED");
      }
      var tokenInfo = JSON.parse(resp.getContentText());
      userEmail = String(tokenInfo.email || "").toLowerCase();
      userName = tokenInfo.name || userEmail;
    } else if (payload.demoEmail) {
      userEmail = String(payload.demoEmail || "").toLowerCase();
    }

    if (!userEmail) throw createError("No email provided.", "BAD_REQUEST");

    // Check if first-time deployment by owner
    var effectiveOwner = getProperty("OWNER_EMAIL") || OWNER_EMAIL;
    if (db.users.length === 0 || (db.users.length === 1 && db.users[0].email === OWNER_EMAIL)) {
      effectiveOwner = userEmail;
      setProperty("OWNER_EMAIL", userEmail);
      if (db.users.length > 0 && db.users[0].email === OWNER_EMAIL) {
        db.users[0].email = userEmail;
        db.users[0].name = userName || "Station Administrator";
      }
    }

    var u = findUser(db, userEmail);
    if (!u) {
      // If user is owner, auto-add as admin
      if (userEmail === effectiveOwner) {
        u = {
          email: userEmail,
          name: userName || "Station Administrator",
          role: "admin",
          status: "Active",
          addedBy: "system",
          addedOn: stamp(),
          lastLogin: stamp(),
          lastActivity: stamp(),
          notes: "Station Administrator (Primary Owner)"
        };
        db.users.push(u);
      } else {
        addLog(db, "login", {
          Email: userEmail,
          Event: "LOGIN_DENIED",
          Result: "FAILED",
          Browser: client.ua,
          IP: client.ip,
          Details: "User is not authorized by Station Administrator"
        });
        saveDatabase(db);
        throw createError("Access denied for " + userEmail + ". Please contact the Station Administrator.", "NOT_AUTHORISED");
      }
    }

    if (u.status !== "Active") {
      addLog(db, "login", { Email: userEmail, Event: "LOGIN_DENIED", Result: "FAILED", Details: "Account is " + u.status });
      saveDatabase(db);
      throw createError("Your account is " + u.status + ". Contact Administrator.", "NOT_AUTHORISED");
    }

    var token = "ses_" + Utilities.getUuid().replace(/-/g, "").slice(0, 18);
    db.sessions[token] = {
      email: u.email,
      name: userName || u.name,
      role: u.role,
      sid: token.slice(0, 10),
      created: Date.now()
    };
    u.lastLogin = stamp();
    if (userName) u.name = userName;

    addLog(db, "login", {
      Email: u.email,
      Name: u.name,
      Event: "LOGIN_SUCCESS",
      Result: "SUCCESS",
      Session: token.slice(0, 10),
      Browser: client.ua,
      IP: client.ip,
      Details: "Role: " + u.role
    });

    saveDatabase(db);
    return {
      session: token,
      user: {
        email: u.email,
        name: u.name,
        role: u.role,
        sid: token.slice(0, 10),
        isOwner: u.email === effectiveOwner
      },
      sessionHours: 12
    };
  }

  // 3. Username / Password Login
  if (action === "auth.passwordLogin") {
    var uname = String(payload.username || "").trim().toLowerCase();
    var pu = findUser(db, uname);
    if (!pu || !pu.pw || pu.pw !== hashPassword(payload.password)) {
      addLog(db, "login", {
        Email: uname,
        Event: "LOGIN_FAILED",
        Result: "FAILED",
        Browser: client.ua,
        Details: "Password sign-in failed"
      });
      saveDatabase(db);
      throw createError("Invalid username or password.", "AUTH_FAILED");
    }

    if (pu.status !== "Active") {
      saveDatabase(db);
      throw createError("Account is " + pu.status + ".", "NOT_AUTHORISED");
    }

    var ptoken = "ses_" + Utilities.getUuid().replace(/-/g, "").slice(0, 18);
    db.sessions[ptoken] = {
      email: pu.email,
      name: pu.name,
      role: pu.role,
      sid: ptoken.slice(0, 10),
      mustChange: !!pu.mustChange,
      created: Date.now()
    };
    pu.lastLogin = stamp();

    addLog(db, "login", {
      Email: pu.email,
      Name: pu.name,
      Event: "LOGIN_SUCCESS",
      Result: "SUCCESS",
      Session: ptoken.slice(0, 10),
      Browser: client.ua,
      Details: "Password sign-in · Role: " + pu.role
    });

    saveDatabase(db);
    var isOwner = pu.email === (getProperty("OWNER_EMAIL") || OWNER_EMAIL);
    return {
      session: ptoken,
      user: {
        email: pu.email,
        name: pu.name,
        role: pu.role,
        sid: ptoken.slice(0, 10),
        method: "password",
        mustChangePassword: !!pu.mustChange,
        isOwner: isOwner
      }
    };
  }

  // Authenticate Session
  var sess = db.sessions[sessionToken];
  if (!sess) {
    addLog(db, "login", { Email: client.emailHint || "", Event: "SESSION_EXPIRED", Result: "EXPIRED", Browser: client.ua });
    saveDatabase(db);
    throw createError("Your session has expired. Please sign in again.", "AUTH_EXPIRED");
  }

  var currentUser = findUser(db, sess.email);
  if (!currentUser || currentUser.status !== "Active") {
    delete db.sessions[sessionToken];
    saveDatabase(db);
    throw createError("Your account access has been withdrawn.", "AUTH_EXPIRED");
  }

  ctx = {
    email: sess.email,
    name: currentUser.name || sess.name,
    role: currentUser.role,
    sid: sess.sid
  };

  if (sess.mustChange && ["auth.changePassword", "auth.logout", "logs.error"].indexOf(action) === -1) {
    throw createError("Please change your password to continue.", "PASSWORD_CHANGE");
  }

  function requireRole(roleName) {
    if ((ROLES[ctx.role] || 0) < (ROLES[roleName] || 0)) {
      throw createError("Your role (" + ctx.role + ") does not allow this action. Required: " + roleName, "FORBIDDEN");
    }
  }

  function hasRole(roleName) {
    return (ROLES[ctx.role] || 0) >= (ROLES[roleName] || 0);
  }

  var TOP = {
    records: "editor", attendance: "editor", paradeOverrides: "editor", paradeMeta: "editor",
    dutyTypes: "editor", strengthTable: "editor", tips: "editor", tipsVersion: "editor",
    usedTipIndices: "editor", personnel: "admin", dutyOrder: "admin", settings: "admin", meta: "admin"
  };

  var out = null;

  switch (action) {
    case "auth.logout":
      delete db.sessions[sessionToken];
      addLog(db, "login", { Email: ctx.email, Name: ctx.name, Event: "LOGOUT", Result: "SUCCESS", Session: ctx.sid });
      out = { loggedOut: true };
      break;

    case "auth.me":
      out = { user: ctx };
      break;

    case "auth.changePassword":
      var meUser = findUser(db, ctx.email);
      if (meUser.pw && !sess.mustChange && meUser.pw !== hashPassword(payload.oldPassword)) {
        throw createError("Current password does not match.", "BAD_REQUEST");
      }
      meUser.pw = hashPassword(payload.newPassword);
      meUser.mustChange = false;
      sess.mustChange = false;
      addActivity(db, ctx, { module: "Users", action: "Change password", record: ctx.email });
      out = { changed: true };
      break;

    case "data.bootstrap":
      var effectiveOwnerMail = getProperty("OWNER_EMAIL") || OWNER_EMAIL;
      var curYr = (new Date()).getFullYear();
      var yrs = [curYr - 1, curYr, curYr + 1];
      Object.keys(db.records || {}).forEach(function(k){
        var y = parseInt(k.slice(0, 4), 10);
        if (y && yrs.indexOf(y) === -1) yrs.push(y);
      });
      out = {
        version: db.version,
        core: db.core,
        records: db.records,
        attendance: db.attendance,
        loadedYears: yrs,
        availableYears: yrs,
        user: {
          email: ctx.email,
          name: ctx.name,
          role: ctx.role,
          sid: ctx.sid,
          isOwner: ctx.email === effectiveOwnerMail
        },
        lastModifiedBy: db.lastModifiedBy,
        lastModifiedAt: db.lastModifiedAt,
        serverTime: stamp()
      };
      break;

    case "data.getYear":
      var yr = String(payload.year || "");
      var yrRecords = {};
      Object.keys(db.records || {}).forEach(function(k){
        if (k.indexOf(yr) === 0) yrRecords[k] = db.records[k];
      });
      out = { year: Number(yr), records: yrRecords };
      break;

    case "data.poll":
      out = {
        version: db.version,
        lastModifiedBy: db.lastModifiedBy,
        lastModifiedAt: db.lastModifiedAt
      };
      break;

    case "data.save":
      requireRole("editor");
      var prevVer = db.version;
      var perms = (db.core.settings && db.core.settings.permissions) || {};

      (payload.changes || []).forEach(function (ch) {
        var parts = String(ch.path).split("/").filter(Boolean);
        var topSection = parts[0];
        var reqRole = TOP[topSection] || "admin";
        if (topSection === "personnel" && perms.editorsManagePersonnel) reqRole = "editor";
        if (topSection === "dutyOrder" && perms.editorsReorderDuties) reqRole = "editor";

        if (!hasRole(reqRole)) {
          throw createError("Role " + ctx.role + " cannot modify " + topSection, "FORBIDDEN");
        }

        if (topSection === "records") setDeepPath(db.records, parts.slice(1), ch.value);
        else if (topSection === "attendance") setDeepPath(db.attendance, parts.slice(1), ch.value);
        else setDeepPath(db.core, parts, ch.value);
      });

      if ((payload.changes || []).length > 0) {
        db.version++;
        db.lastModifiedBy = ctx.name;
        db.lastModifiedAt = stamp();
      }

      (payload.audit || []).forEach(function (a) {
        addActivity(db, ctx, a);
      });
      currentUser.lastActivity = stamp();

      out = { version: db.version, prevVersion: prevVer, savedAt: stamp() };
      break;

    case "data.replaceAll":
      requireRole("admin");
      createBackup(db, "Before data replace: " + (payload.reason || "import"), ctx.email);
      db.core = payload.data.core || {};
      db.records = payload.data.records || {};
      db.attendance = payload.data.attendance || {};
      db.version++;
      db.lastModifiedBy = ctx.name;
      db.lastModifiedAt = stamp();
      out = { version: db.version };
      break;

    case "data.exportAll":
      requireRole("admin");
      addActivity(db, ctx, { module: "Backup", action: "Export all data", record: "Full backup" });
      out = {
        core: db.core,
        records: db.records,
        attendance: db.attendance,
        exportedAt: stamp(),
        exportedBy: ctx.email,
        version: db.version
      };
      break;

    case "users.list":
      requireRole("admin");
      out = { users: sanitizeUsers(db) };
      break;

    case "users.save":
      requireRole("admin");
      var uEmail = String(payload.email || "").trim().toLowerCase();
      if (!uEmail) throw createError("Invalid email or username.", "BAD_REQUEST");

      var targetUser = findUser(db, uEmail);
      if (targetUser) {
        addActivity(db, ctx, { module: "Users", action: "Update user", record: uEmail, newValue: payload.role });
        targetUser.role = payload.role || targetUser.role;
        targetUser.status = payload.status === "Disabled" ? "Disabled" : "Active";
        if (payload.name) targetUser.name = payload.name;
      } else {
        db.users.push({
          email: uEmail,
          name: payload.name || "",
          role: payload.role || "viewer",
          status: payload.status === "Disabled" ? "Disabled" : "Active",
          addedBy: ctx.email,
          addedOn: stamp(),
          lastLogin: "",
          lastActivity: "",
          notes: payload.notes || "",
          pw: payload.password ? hashPassword(payload.password) : "",
          mustChange: !!payload.password
        });
        addActivity(db, ctx, { module: "Users", action: "Add user", record: uEmail, newValue: payload.role });
      }
      out = { users: sanitizeUsers(db) };
      break;

    case "users.setPassword":
      requireRole("admin");
      var pwUser = findUser(db, String(payload.email).toLowerCase());
      if (!pwUser) throw createError("User not found.", "BAD_REQUEST");
      if (payload.clear) {
        pwUser.pw = "";
        pwUser.mustChange = false;
        addActivity(db, ctx, { module: "Users", action: "Clear password", record: pwUser.email });
      } else {
        pwUser.pw = hashPassword(payload.password);
        pwUser.mustChange = payload.mustChange !== false;
        addActivity(db, ctx, { module: "Users", action: "Set password", record: pwUser.email });
      }
      out = { users: sanitizeUsers(db) };
      break;

    case "users.remove":
      requireRole("admin");
      var delUser = findUser(db, String(payload.email).toLowerCase());
      if (!delUser) throw createError("User not found.", "BAD_REQUEST");
      delUser.status = "Removed";
      addActivity(db, ctx, { module: "Users", action: "Remove user", record: delUser.email });
      out = { users: sanitizeUsers(db) };
      break;

    case "logs.query":
      requireRole("admin");
      var logList = (db[payload.type] || db.activity || []).slice().reverse();
      var fromMs = payload.from ? new Date(payload.from + "T00:00:00").getTime() : null;
      var toMs = payload.to ? new Date(payload.to + "T23:59:59").getTime() : null;
      var fEmail = String(payload.email || "").toLowerCase();

      var filtered = logList.filter(function (r) {
        if (fromMs && r._ts < fromMs) return false;
        if (toMs && r._ts > toMs) return false;
        if (fEmail && String(r.Email || "").toLowerCase().indexOf(fEmail) === -1) return false;
        return true;
      });

      var pageSize = payload.pageSize || 50;
      var pageNum = payload.page || 1;
      out = {
        headers: HEAD[payload.type] || HEAD.activity,
        rows: payload.all ? filtered : filtered.slice((pageNum - 1) * pageSize, pageNum * pageSize),
        total: filtered.length,
        page: pageNum,
        pageSize: pageSize
      };
      break;

    case "logs.recent":
      var recRows = (db.activity || []).slice(-(payload.limit || 8)).reverse().map(function (r) {
        return {
          time: r.Timestamp,
          name: r.Name || r.Email,
          module: r.Module,
          action: r.Action,
          record: r.Record,
          result: r.Result
        };
      });
      out = { rows: recRows };
      break;

    case "logs.error":
      (payload.entries || []).forEach(function (x) {
        addLog(db, "error", {
          Email: ctx.email,
          Module: x.module,
          Operation: x.operation,
          Error: x.error,
          "Stack / Details": x.stack,
          Browser: client.ua,
          Status: x.status || "FAILED"
        });
      });
      out = { logged: (payload.entries || []).length };
      break;

    case "logs.activity":
      (payload.entries || []).forEach(function (a) {
        addActivity(db, ctx, a);
      });
      out = { logged: (payload.entries || []).length };
      break;

    case "backup.list":
      requireRole("admin");
      out = {
        backups: db.backups.map(function (b) {
          var copy = JSON.parse(JSON.stringify(b));
          delete copy.content;
          return copy;
        }),
        total: db.backups.length,
        version: db.version
      };
      break;

    case "backup.create":
      requireRole("admin");
      var newB = createBackup(db, payload.reason || "Manual backup", ctx.email);
      addActivity(db, ctx, { module: "Backup", action: "Create backup", record: newB.name });
      out = {
        backups: db.backups.map(function (b) {
          var copy = JSON.parse(JSON.stringify(b));
          delete copy.content;
          return copy;
        }),
        total: db.backups.length
      };
      break;

    case "backup.get":
      requireRole("admin");
      var bMatch = db.backups.filter(function (b) { return b.id === payload.id; })[0];
      if (!bMatch) throw createError("Backup not found", "BAD_REQUEST");
      out = { name: bMatch.name, content: bMatch.content };
      break;

    case "backup.restore":
      requireRole("admin");
      var rMatch = db.backups.filter(function (b) { return b.id === payload.id; })[0];
      if (!rMatch) throw createError("Backup not found", "BAD_REQUEST");
      var safeCopy = createBackup(db, "Before restore of " + rMatch.name, ctx.email);
      var restoredData = JSON.parse(rMatch.content);
      db.core = restoredData.core || {};
      db.records = restoredData.records || {};
      db.attendance = restoredData.attendance || {};
      db.version++;
      db.lastModifiedBy = ctx.name;
      db.lastModifiedAt = stamp();
      addActivity(db, ctx, { module: "Backup", action: "Restore backup", record: rMatch.name });
      out = { version: db.version, safetyBackup: safeCopy.name };
      break;

    case "reports.save":
      // Save report PDF/Excel file into Google Drive "Reports" folder
      var reportsFolder = getOrCreateFolder("Reports", getDatabaseFolder());
      var fileBytes = Utilities.base64Decode(payload.base64Content || "");
      var createdFile = reportsFolder.createFile(Utilities.newBlob(fileBytes, payload.mimeType || "application/pdf", payload.fileName || "Duty_Report.pdf"));
      addActivity(db, ctx, { module: "Reports", action: "Saved report to Drive", record: payload.fileName });
      out = { id: createdFile.getId(), url: createdFile.getUrl(), name: createdFile.getName() };
      break;

    default:
      throw createError("Unknown action: " + action, "BAD_REQUEST");
  }

  saveDatabase(db);
  return out;
}

// ============================================================================
// Google Drive Storage Engine
// ============================================================================

function getDatabaseFolder() {
  var folderId = getProperty("DB_FOLDER_ID");
  if (folderId) {
    try {
      return DriveApp.getFolderById(folderId);
    } catch (e) {}
  }
  var folders = DriveApp.getFoldersByName(DB_FOLDER_NAME);
  var folder = folders.hasNext() ? folders.next() : DriveApp.createFolder(DB_FOLDER_NAME);
  setProperty("DB_FOLDER_ID", folder.getId());
  return folder;
}

function getOrCreateFolder(name, parentFolder) {
  var folders = parentFolder.getFoldersByName(name);
  return folders.hasNext() ? folders.next() : parentFolder.createFolder(name);
}

function getDatabaseFile() {
  var fileId = getProperty("DB_FILE_ID");
  if (fileId) {
    try {
      return DriveApp.getFileById(fileId);
    } catch (e) {}
  }
  var folder = getDatabaseFolder();
  var files = folder.getFilesByName("malihabad_db.json");
  var file = files.hasNext() ? files.next() : null;
  if (!file) {
    var initialDb = getInitialDatabase();
    file = folder.createFile("malihabad_db.json", JSON.stringify(initialDb, null, 2), MimeType.PLAIN_TEXT);
  }
  setProperty("DB_FILE_ID", file.getId());
  return file;
}

function loadDatabase() {
  var file = getDatabaseFile();
  var text = file.getBlob().getDataAsString();
  try {
    return JSON.parse(text);
  } catch (e) {
    return getInitialDatabase();
  }
}

function saveDatabase(db) {
  var file = getDatabaseFile();
  file.setContent(JSON.stringify(db));
}

// ============================================================================
// Initial Database for Police Station Malihabad, Lucknow North (UP Police)
// ============================================================================

function getInitialDatabase() {
  var ownerMail = getProperty("OWNER_EMAIL") || OWNER_EMAIL;
  return {
    version: 1,
    core: {
      settings: {
        stationName: "Police Station Malihabad",
        stationCity: "District Lucknow (North)",
        reportShort: "PS MALIHABAD",
        expectedStrength: 52,
        presentCode: "P",
        attendanceCodes: {},
        permissions: { editorsManagePersonnel: true, editorsReorderDuties: true },
        saveReportsToDrive: true,
        seniorDutiesFirst: true,
        editLockHour: 14
      },
      dutyOrder: [
        "sho", "day_officer", "night_officer", "head_moharrir", "gd_writer",
        "crime_inv", "day_sentry", "night_sentry", "hawalat_guard",
        "dial_112", "cheetah_mobile", "pink_booth", "parokar_court",
        "saman_warrant", "petition_enq", "law_and_order", "driver", "other_duty"
      ],
      dutyTypes: [
        { name: "Pink Booth / Mahila Desk", category: "duty" },
        { name: "Dial 112 / PRV Duty", category: "duty" },
        { name: "Cheetah Mobile / Patrolling", category: "duty" },
        { name: "Court / Parokar Duty", category: "duty" },
        { name: "VIP / Mela Duty", category: "duty" },
        { name: "Saman & Warrant Tameela", category: "duty" }
      ],
      paradeOverrides: {},
      paradeMeta: {},
      usedTipIndices: [],
      tipsVersion: "police-365-v1",
      tips: [],
      personnel: [
        { id: "p1", name: "Inspector Ajay Kumar", rank: "Inspector", attached: false, status: "active", phone: "9454403800", penNo: "UPP1024", remarks: "SHO / प्रभारी निरीक्षक" },
        { id: "p2", name: "SSI Rakesh Singh", rank: "SSI", attached: false, status: "active", phone: "9454403801", penNo: "UPP1025", remarks: "Senior Sub-Inspector" },
        { id: "p3", name: "SI Ramesh Chandra", rank: "SI", attached: false, status: "active", phone: "", penNo: "UPP2011", remarks: "चौकी प्रभारी मलिहाबाद" },
        { id: "p4", name: "SI Vijay Shankar", rank: "SI", attached: false, status: "active", phone: "", penNo: "UPP2012", remarks: "चौकी प्रभारी रहीमाबाद" },
        { id: "p5", name: "SI Dinesh Pratap", rank: "SI", attached: false, status: "active", phone: "", penNo: "UPP2013", remarks: "विवेचक (IO)" },
        { id: "p6", name: "ASI Ram Prasad", rank: "ASI", attached: false, status: "active", phone: "", penNo: "UPP3010", remarks: "हेड मुहर्रिर (कार्यालय)" },
        { id: "p7", name: "HC Satish Kumar", rank: "Head Constable", attached: false, status: "active", phone: "", penNo: "UPP4011", remarks: "जीडी लेखक" },
        { id: "p8", name: "HC Manoj Tiwari", rank: "Head Constable", attached: false, status: "active", phone: "", penNo: "UPP4012", remarks: "हवालात गार्ड" },
        { id: "p9", name: "HC Anil Yadav", rank: "Head Constable", attached: false, status: "active", phone: "", penNo: "UPP4013", remarks: "चीता मोबाइल" },
        { id: "p10", name: "CP Dharmendra Verma", rank: "Constable", attached: false, status: "active", phone: "", penNo: "UPP5021", remarks: "डायल 112" },
        { id: "p11", name: "CP Kuldeep Singh", rank: "Constable", attached: false, status: "active", phone: "", penNo: "UPP5022", remarks: "संतरी पहरा" },
        { id: "p12", name: "CP Amit Kumar", rank: "Constable", attached: false, status: "active", phone: "", penNo: "UPP5023", remarks: "बीट आरक्षी" },
        { id: "p13", name: "W/CP Pooja Sharma", rank: "W/Constable", attached: false, status: "active", phone: "", penNo: "UPP6011", remarks: "महिला हेल्प डेस्क" },
        { id: "p14", name: "W/CP Sunita Devi", rank: "W/Constable", attached: false, status: "active", phone: "", penNo: "UPP6012", remarks: "पिंक बूथ" },
        { id: "p15", name: "DVR CP Harishankar", rank: "Driver", attached: false, status: "active", phone: "", penNo: "UPP7001", remarks: "चालक सरकारी जीप" },
        { id: "p16", name: "HG Ramu Pal", rank: "Home Guard", attached: false, status: "active", phone: "", penNo: "HG101", remarks: "होमगार्ड ड्यूटी" }
      ],
      strengthTable: {
        columns: [
          { key: "sho", group: "SHO / Inspr", sub: "" },
          { key: "ssi", group: "SSI", sub: "" },
          { key: "si", group: "SI", sub: "" },
          { key: "asi", group: "ASI", sub: "" },
          { key: "hc", group: "Head Const.", sub: "" },
          { key: "cp", group: "Constable", sub: "" },
          { key: "wcp", group: "W/Constable", sub: "" },
          { key: "dvr", group: "Driver", sub: "" },
          { key: "hg", group: "Home Guard", sub: "" }
        ],
        values: {
          sanctioned: { sho: 1, ssi: 1, si: 8, asi: 2, hc: 14, cp: 32, wcp: 6, dvr: 2, hg: 10 },
          existing:   { sho: 1, ssi: 1, si: 7, asi: 2, hc: 12, cp: 28, wcp: 5, dvr: 2, hg: 8 },
          attached:   { sho: 0, ssi: 0, si: 0, asi: 0, hc: 1,  cp: 2,  wcp: 0, dvr: 0, hg: 0 },
          vacancy:    { sho: 0, ssi: 0, si: 1, asi: 0, hc: 2,  cp: 4,  wcp: 1, dvr: 0, hg: 2 }
        },
        dataFixVersion: 3
      },
      meta: { rosterOrdered: true, createdAt: new Date().toISOString() }
    },
    records: {},
    attendance: {},
    users: [
      {
        email: ownerMail,
        name: "प्रभारी निरीक्षक (SHO)",
        role: "admin",
        status: "Active",
        addedBy: "system",
        addedOn: stamp(),
        lastLogin: "",
        lastActivity: "",
        notes: "Administrator (SHO / Thana Incharge)",
        pw: hashPassword("Admin@123"), // Default initial password
        mustChange: false
      },
      {
        email: "diwan.malihabad@uppolice.gov.in",
        name: "हेड मुहर्रिर / दीवान जी",
        role: "editor",
        status: "Active",
        addedBy: ownerMail,
        addedOn: stamp(),
        lastLogin: "",
        lastActivity: "",
        notes: "Duty Writer / दीवान जी",
        pw: hashPassword("Duty@123"),
        mustChange: false
      },
      {
        email: "beat.malihabad@uppolice.gov.in",
        name: "बीट आरक्षी / सिपाही",
        role: "viewer",
        status: "Active",
        addedBy: ownerMail,
        addedOn: stamp(),
        lastLogin: "",
        lastActivity: "",
        notes: "Viewer (ड्यूटी देखने हेतु)",
        pw: hashPassword("Beat@123"),
        mustChange: false
      }
    ],
    login: [],
    activity: [],
    error: [],
    backups: [],
    sessions: {},
    lastModifiedBy: "System Setup",
    lastModifiedAt: stamp(),
    lastBackupAt: 0
  };
}

// ============================================================================
// Utilities & Helpers
// ============================================================================

function findUser(db, emailOrUname) {
  var q = String(emailOrUname || "").trim().toLowerCase();
  for (var i = 0; i < db.users.length; i++) {
    var umail = (db.users[i].email || "").toLowerCase();
    var uname = umail.split("@")[0];
    if (umail === q || uname === q ||
        (q === "admin" && db.users[i].role === "admin") ||
        (q === "sho" && db.users[i].role === "admin") ||
        (q === "diwan" && db.users[i].role === "editor") ||
        (q === "beat" && db.users[i].role === "viewer")) {
      return db.users[i];
    }
  }
  return null;
}

function sanitizeUsers(db) {
  var ownerMail = getProperty("OWNER_EMAIL") || OWNER_EMAIL;
  return db.users.map(function (u) {
    return {
      email: u.email,
      name: u.name,
      role: u.role,
      status: u.status,
      addedBy: u.addedBy,
      addedOn: u.addedOn,
      lastLogin: u.lastLogin,
      lastActivity: u.lastActivity,
      notes: u.notes,
      hasPassword: !!u.pw,
      isOwner: u.email === ownerMail
    };
  });
}

function addLog(db, type, obj) {
  var headers = HEAD[type] || HEAD.activity;
  var row = {};
  headers.forEach(function (h) {
    row[h] = obj[h] === undefined ? "" : String(obj[h]);
  });
  row.Timestamp = obj.Timestamp || stamp();
  row._ts = obj._ts || Date.now();
  db[type].push(row);
  if (db[type].length > 2500) db[type] = db[type].slice(-2500);
}

function addActivity(db, ctx, a) {
  addLog(db, "activity", {
    Timestamp: stamp(),
    _ts: Date.now(),
    Email: ctx.email,
    Name: ctx.name,
    Role: ctx.role,
    Module: a.module,
    Action: a.action,
    Record: a.record,
    "Old Value": a.oldValue,
    "New Value": a.newValue,
    Result: a.result || "SUCCESS",
    Session: ctx.sid
  });
}

function createBackup(db, reason, byUser) {
  var bId = "b" + Date.now();
  var bObj = {
    id: bId,
    name: "backup-" + stamp().replace(/[: ]/g, "-") + ".json",
    created: stamp(),
    ts: Date.now(),
    reason: reason,
    createdBy: byUser,
    version: db.version,
    content: JSON.stringify({
      core: db.core,
      records: db.records,
      attendance: db.attendance,
      backup: { reason: reason, createdBy: byUser, version: db.version }
    })
  };
  bObj.size = bObj.content.length;
  db.backups.unshift(bObj);
  db.backups = db.backups.slice(0, 15);
  db.lastBackupAt = Date.now();
  return bObj;
}

function setDeepPath(obj, parts, value) {
  var o = obj;
  for (var i = 0; i < parts.length - 1; i++) {
    if (!o[parts[i]] || typeof o[parts[i]] !== "object") o[parts[i]] = {};
    o = o[parts[i]];
  }
  var last = parts[parts.length - 1];
  if (value === null || value === undefined) delete o[last];
  else o[last] = value;
}

function hashPassword(password) {
  return "d$" + Utilities.base64Encode(Utilities.computeDigest(Utilities.DigestAlgorithm.SHA_256, String(password || "") + "|uppolice_malihabad"));
}

function stamp(d) {
  d = d || new Date();
  return Utilities.formatDate(d, "Asia/Kolkata", "dd-MM-yyyy HH:mm:ss");
}

function createError(msg, code) {
  var e = new Error(msg);
  e.code = code || "SERVER_ERROR";
  return e;
}

function getProperty(key) {
  return PropertiesService.getScriptProperties().getProperty(key);
}

function setProperty(key, val) {
  PropertiesService.getScriptProperties().setProperty(key, val);
}
