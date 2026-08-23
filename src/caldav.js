const db = require("./db");

let syncTimer = null;
let syncInProgress = false;

function toDateKey(date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function addDays(date, days) {
  const nextDate = new Date(date);
  nextDate.setDate(nextDate.getDate() + days);
  return nextDate;
}

function toIcsDate(dateKey) {
  return String(dateKey || "").replaceAll("-", "");
}

function escapeIcsValue(value) {
  return String(value || "")
    .replaceAll("\\", "\\\\")
    .replaceAll(";", "\\;")
    .replaceAll(",", "\\,")
    .replace(/\r?\n/g, "\\n");
}

function foldIcsLine(line) {
  const chunks = [];
  let remaining = line;
  while (remaining.length > 75) {
    chunks.push(remaining.slice(0, 75));
    remaining = ` ${remaining.slice(75)}`;
  }
  chunks.push(remaining);
  return chunks.join("\r\n");
}

function buildIcs(event) {
  const uid = `drmaintenance-${String(event.id).replace(/[^a-z0-9_-]+/gi, "-")}@drmaintenance`;
  const dueDate = toIcsDate(event.dueDate);
  const endDate = toIcsDate(toDateKey(addDays(new Date(`${event.dueDate}T00:00:00`), 1)));
  const summary = event.targetName || event.title || "Wartung";
  const description = [
    event.title,
    event.employeeName ? `Mitarbeiter: ${event.employeeName}` : "",
    event.intervalDays ? `Intervall: ${event.intervalDays} Tage` : ""
  ].filter(Boolean).join("\n");

  return [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//DR Maintenance//Wartungskalender//DE",
    "CALSCALE:GREGORIAN",
    "METHOD:PUBLISH",
    "BEGIN:VEVENT",
    `UID:${escapeIcsValue(uid)}`,
    `DTSTAMP:${new Date().toISOString().replace(/[-:]/g, "").replace(/\.\d{3}Z$/, "Z")}`,
    `DTSTART;VALUE=DATE:${dueDate}`,
    `DTEND;VALUE=DATE:${endDate}`,
    `SUMMARY:${escapeIcsValue(summary)}`,
    `DESCRIPTION:${escapeIcsValue(description)}`,
    "END:VEVENT",
    "END:VCALENDAR"
  ].map(foldIcsLine).join("\r\n");
}

function buildEventUrl(calendarUrl, event) {
  const uid = `drmaintenance-${String(event.id).replace(/[^a-z0-9_-]+/gi, "-")}.ics`;
  const baseUrl = new URL(calendarUrl);
  if (!baseUrl.pathname.endsWith("/")) {
    baseUrl.pathname = `${baseUrl.pathname}/`;
  }
  return new URL(encodeURIComponent(uid), baseUrl).toString();
}

async function syncNow() {
  if (syncInProgress) {
    return;
  }

  syncInProgress = true;
  try {
    const settings = await db.getCaldavCredentials();
    if (!settings.enabled) {
      return;
    }

    if (!settings.calendarUrl) {
      await db.updateCaldavSyncStatus("CalDAV ist aktiviert, aber es ist keine Kalender-URL hinterlegt.");
      return;
    }
    new URL(settings.calendarUrl);

    const today = new Date();
    const startDate = toDateKey(today);
    const endDate = toDateKey(addDays(today, 365));
    const events = await db.getCalendarEvents(startDate, endDate);
    const headers = {
      "Content-Type": "text/calendar; charset=utf-8"
    };

    if (settings.username || settings.password) {
      const token = Buffer.from(`${settings.username}:${settings.password}`).toString("base64");
      headers.Authorization = `Basic ${token}`;
    }

    for (const event of events) {
      const response = await fetch(buildEventUrl(settings.calendarUrl, event), {
        method: "PUT",
        headers,
        body: buildIcs(event)
      });

      if (!response.ok) {
        throw new Error(`CalDAV Sync fehlgeschlagen (${response.status} ${response.statusText}).`);
      }
    }

    await db.updateCaldavSyncStatus(`${events.length} Wartungstermine zu CalDAV synchronisiert.`);
  } catch (error) {
    await db.updateCaldavSyncStatus(error.message || "CalDAV Sync fehlgeschlagen.");
    console.error("CalDAV sync failed", error);
  } finally {
    syncInProgress = false;
  }
}

async function refreshSchedule() {
  if (syncTimer) {
    clearInterval(syncTimer);
    syncTimer = null;
  }

  const settings = await db.getCaldavCredentials();
  if (!settings.enabled || !settings.calendarUrl) {
    return;
  }

  const intervalMs = Math.max(settings.syncIntervalMinutes, 1) * 60 * 1000;
  syncTimer = setInterval(() => {
    syncNow().catch((error) => console.error("CalDAV sync failed", error));
  }, intervalMs);
  syncTimer.unref?.();

  windowlessImmediateSync();
}

function windowlessImmediateSync() {
  setTimeout(() => {
    syncNow().catch((error) => console.error("CalDAV sync failed", error));
  }, 5000).unref?.();
}

module.exports = {
  refreshSchedule,
  syncNow
};
