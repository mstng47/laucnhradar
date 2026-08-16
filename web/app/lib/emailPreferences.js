// Shared between the API routes (server-side validation) and the
// preferences form (the live "Monday–Friday · 7:30 AM · Europe/London"
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

// Returns { value, error } — value is only present when error isn't.
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
  if (eq(sorted, [1, 2, 3, 4, 5])) return "Monday–Friday";
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
  return `${formatDaysLabel(days)} · ${formatTimeLabel(sendTime)} · ${timezone}`;
}

export { isValidEmail, isValidTimezone, validatePreferences, formatDaysLabel, formatTimeLabel, formatScheduleSummary, DAY_SHORT };
