// Resolves "what time is it for this subscriber right now" without a
// timezone library — Intl.DateTimeFormat with a `timeZone` option does
// this natively, and Node ships full ICU data so any IANA zone name works.

const WEEKDAYS = { Sun: 0, Mon: 1, Tue: 2, Wed: 3, Thu: 4, Fri: 5, Sat: 6 };

// weekday: 0=Sunday..6=Saturday, matching JS Date#getDay() — the same
// numbering the preferences form and the "days" column both use, so a
// subscriber's chosen days always mean the same thing everywhere.
function getLocalParts(date, timeZone) {
  const parts = Object.fromEntries(
    new Intl.DateTimeFormat("en-US", {
      timeZone,
      weekday: "short",
      hour: "2-digit",
      minute: "2-digit",
      hourCycle: "h23",
    })
      .formatToParts(date)
      .map((p) => [p.type, p.value])
  );
  return {
    weekday: WEEKDAYS[parts.weekday],
    hour: Number(parts.hour),
    minute: Number(parts.minute),
  };
}

// A subscriber is due once their local clock has reached send_time on one
// of their chosen days AND they haven't already been sent this exact
// digest — deliberately a "has the time passed" check, not "is the time
// now", and with no upper bound: a delayed or skipped cron run (GitHub
// Actions schedules aren't exact) just means the *next* run still catches
// them, rather than skipping that day's email entirely. last_sent_date is
// what stops the same digest going out twice, not the time check.
function isDueNow(subscriber, now, todayDigestDate) {
  if (!subscriber.enabled) return false;
  if (subscriber.last_sent_date === todayDigestDate) return false;

  const { weekday, hour, minute } = getLocalParts(now, subscriber.timezone);
  if (!subscriber.days.includes(weekday)) return false;

  const [sendHour, sendMinute] = subscriber.send_time.split(":").map(Number);
  return hour * 60 + minute >= sendHour * 60 + sendMinute;
}

export { getLocalParts, isDueNow };
