// Shared between the API routes (server-side validation) and the
// preferences form (the live "Monday-Friday - 7:30 AM - Europe/London"
// summary line) so the two never format a schedule two different ways.

const DAY_SHORT = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

function isValidEmail(email) {
  return typeof email === "string" && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim());
}

function isValidTimezone(timezone) {
  if (typeof timezone !== "string" || !timezone) return false;
  try {
    new Intl.DateTimeFormat("en-US", { timeZone: timezone });
    return true;
  } catch {
    return false;
  }
}

// Accepts "HH:MM" (from an <input type="time">) and normalizes to the
// "HH:MM:00" shape the database's `time` column expects.
function normalizeSendTime(sendTime) {
  const match = /^([01]\d|2[0-3]):([0-5]\d)$/.exec(String(sendTime ?? "").trim());
  return match ? `${match[1]}:${match[2]}:00` : null;
}

function normalizeDays(days) {
  if (!Array.isArray(days)) return null;
  const unique = [...new Set(days.map(Number))].filter((d) => Number.isInteger(d) && d >= 0 && d <= 6);
  return unique.length > 0 ? unique.sort((a, b) => a - b) : null;
}

// Returns { value, error } - value is only present when error isn't.
function validatePreferences({ days, sendTime, timezone }) {
  const normalizedDays = normalizeDays(days);
  if (!normalizedDays) return { error: "Choose at least one day." };

  const normalizedTime = normalizeSendTime(sendTime);
  if (!normalizedTime) return { error: "Choose a valid delivery time." };

  if (!isValidTimezone(timezone)) return { error: "Choose a valid timezone." };

  return { value: { days: normalizedDays, sendTime: normalizedTime, timezone } };
}

function formatDaysLabel(days) {
  const sorted = [...days].sort((a, b) => a - b);
  const eq = (a, b) => a.length === b.length && a.every((v, i) => v === b[i]);
  if (eq(sorted, [0, 1, 2, 3, 4, 5, 6])) return "Every day";
  if (eq(sorted, [1, 2, 3, 4, 5])) return "Monday-Friday";
  if (eq(sorted, [0, 6])) return "Weekends";
  return sorted.map((d) => DAY_SHORT[d]).join(", ");
}

// "07:30:00" or "07:30" -> "7:30 AM"
function formatTimeLabel(sendTime) {
  const [h, m] = sendTime.split(":").map(Number);
  const period = h >= 12 ? "PM" : "AM";
  const hour12 = h % 12 === 0 ? 12 : h % 12;
  return `${hour12}:${String(m).padStart(2, "0")} ${period}`;
}

function formatScheduleSummary({ days, sendTime, timezone }) {
  return `${formatDaysLabel(days)} - ${formatTimeLabel(sendTime)} - ${timezone}`;
}

const TIME_STEP_MINUTES = 5;

// "HH:MM" options every 5 minutes across the day, for a <select> instead
// of a native <input type="time"> (whose spinner/clock UI varies wildly
// by browser and doesn't read as a clean dropdown list).
function buildTimeOptions() {
  const options = [];
  for (let mins = 0; mins < 24 * 60; mins += TIME_STEP_MINUTES) {
    const value = `${String(Math.floor(mins / 60)).padStart(2, "0")}:${String(mins % 60).padStart(2, "0")}`;
    options.push({ value, label: formatTimeLabel(value) });
  }
  return options;
}

// One representative city per UTC offset, so the timezone picker shows a
// couple dozen recognizable places instead of the several hundred IANA
// zone names Intl knows about (which mostly differ from each other only
// in historical DST rules, not in anything a reader picking a delivery
// hour cares about). Roughly west-to-east so ties (two candidates
// currently sharing an offset) resolve to whichever is listed first.
const TIMEZONE_CANDIDATES = [
  ["Pago Pago", "Pacific/Pago_Pago"],
  ["Honolulu", "Pacific/Honolulu"],
  ["Anchorage", "America/Anchorage"],
  ["Los Angeles", "America/Los_Angeles"],
  ["Denver", "America/Denver"],
  ["Chicago", "America/Chicago"],
  ["New York", "America/New_York"],
  ["Halifax", "America/Halifax"],
  ["Sao Paulo", "America/Sao_Paulo"],
  ["Noronha", "America/Noronha"],
  ["Azores", "Atlantic/Azores"],
  ["Dublin", "Europe/Dublin"],
  ["Paris", "Europe/Paris"],
  ["Athens", "Europe/Athens"],
  ["Moscow", "Europe/Moscow"],
  ["Dubai", "Asia/Dubai"],
  ["Karachi", "Asia/Karachi"],
  ["Kolkata", "Asia/Kolkata"],
  ["Dhaka", "Asia/Dhaka"],
  ["Bangkok", "Asia/Bangkok"],
  ["Singapore", "Asia/Singapore"],
  ["Tokyo", "Asia/Tokyo"],
  ["Adelaide", "Australia/Adelaide"],
  ["Sydney", "Australia/Sydney"],
  ["Noumea", "Pacific/Noumea"],
  ["Auckland", "Pacific/Auckland"],
];

// Several of these zones observe DST and shift between two offsets
// depending on the time of year, so this is computed live against "now"
// rather than hardcoded - the label is only ever a snapshot of the
// offset that zone is actually on right now.
function offsetLabelFor(zone, now) {
  const parts = new Intl.DateTimeFormat("en-US", { timeZone: zone, timeZoneName: "shortOffset" }).formatToParts(now);
  const raw = parts.find((p) => p.type === "timeZoneName")?.value ?? "GMT+0";
  return raw === "GMT" ? "GMT+0" : raw;
}

function buildTimezoneOptions(now = new Date()) {
  const seenOffsets = new Set();
  const options = [];
  for (const [city, zone] of TIMEZONE_CANDIDATES) {
    let offset;
    try {
      offset = offsetLabelFor(zone, now);
    } catch {
      continue; // Unsupported in this runtime's ICU data - skip rather than break the list.
    }
    if (seenOffsets.has(offset)) continue; // Already have a representative for this offset.
    seenOffsets.add(offset);
    options.push({ value: zone, label: `${city} (${offset})` });
  }
  return options;
}

export {
  isValidEmail,
  isValidTimezone,
  validatePreferences,
  formatDaysLabel,
  formatTimeLabel,
  formatScheduleSummary,
  buildTimeOptions,
  buildTimezoneOptions,
  DAY_SHORT,
};
