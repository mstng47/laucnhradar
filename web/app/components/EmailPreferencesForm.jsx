"use client";

import { useMemo, useState } from "react";
import { DAY_SHORT, formatScheduleSummary } from "../lib/emailPreferences";

// Displayed Monday-first (the usual week view) even though the value
// stored and sent is still 0=Sunday..6=Saturday everywhere else — this is
// the one place that ordering gets flipped, purely for how the buttons
// lay out on screen.
const DISPLAY_ORDER = [1, 2, 3, 4, 5, 6, 0];

const FALLBACK_TIMEZONES = [
  "UTC",
  "Europe/London",
  "Europe/Paris",
  "Europe/Berlin",
  "America/New_York",
  "America/Chicago",
  "America/Denver",
  "America/Los_Angeles",
  "Asia/Tokyo",
  "Asia/Singapore",
  "Asia/Kolkata",
  "Australia/Sydney",
];

function guessTimezone() {
  try {
    return Intl.DateTimeFormat().resolvedOptions().timeZone || "UTC";
  } catch {
    return "UTC";
  }
}

// mode: "create" (blank signup form) or "edit" (prefilled from a token —
// see web/app/email/page.jsx). initial holds whatever the page already
// knows: nothing for create, the subscriber's saved row for edit.
export default function EmailPreferencesForm({ mode, token, initial }) {
  const [email, setEmail] = useState(initial?.email ?? "");
  const [days, setDays] = useState(initial?.days ?? [1, 2, 3, 4, 5]);
  const [sendTime, setSendTime] = useState(initial?.sendTime ?? "07:30");
  const [timezone, setTimezone] = useState(initial?.timezone ?? guessTimezone());
  const [enabled, setEnabled] = useState(initial?.enabled ?? true);
  const [status, setStatus] = useState("idle"); // idle | saving | saved | error | unsubscribed
  const [errorMessage, setErrorMessage] = useState("");

  const timezones = useMemo(() => {
    try {
      const all = Intl.supportedValuesOf("timeZone");
      return all.includes(timezone) ? all : [timezone, ...all];
    } catch {
      return FALLBACK_TIMEZONES.includes(timezone) ? FALLBACK_TIMEZONES : [timezone, ...FALLBACK_TIMEZONES];
    }
  }, [timezone]);

  function toggleDay(day) {
    setDays((prev) => (prev.includes(day) ? prev.filter((d) => d !== day) : [...prev, day].sort((a, b) => a - b)));
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setStatus("saving");
    setErrorMessage("");

    try {
      const res = await fetch("/api/subscribe", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...(mode === "edit" ? { token } : { email }),
          days,
          sendTime,
          timezone,
          enabled,
        }),
      });
      const body = await res.json();
      if (!res.ok) throw new Error(body.error || "Something went wrong. Try again.");
      setStatus("saved");
    } catch (err) {
      setStatus("error");
      setErrorMessage(err.message);
    }
  }

  async function handleUnsubscribe() {
    setStatus("saving");
    setErrorMessage("");
    try {
      const res = await fetch(`/api/unsubscribe?token=${encodeURIComponent(token)}`, { method: "POST" });
      const body = await res.json();
      if (!res.ok) throw new Error(body.error || "Something went wrong. Try again.");
      setEnabled(false);
      setStatus("unsubscribed");
    } catch (err) {
      setStatus("error");
      setErrorMessage(err.message);
    }
  }

  const daysValid = days.length > 0;

  return (
    <form className="email-form" onSubmit={handleSubmit}>
      {mode === "create" && (
        <div className="field-group">
          <label className="field-label" htmlFor="email">
            Email address
          </label>
          <input
            id="email"
            className="field-input"
            type="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="you@example.com"
          />
        </div>
      )}

      <div className="field-group">
        <span className="field-label">Days</span>
        <div className="day-toggles" role="group" aria-label="Delivery days">
          {DISPLAY_ORDER.map((day) => (
            <button
              key={day}
              type="button"
              className="day-toggle"
              aria-pressed={days.includes(day)}
              onClick={() => toggleDay(day)}
            >
              {DAY_SHORT[day]}
            </button>
          ))}
        </div>
        {!daysValid && <p className="field-hint is-error">Choose at least one day.</p>}
      </div>

      <div className="field-group">
        <label className="field-label" htmlFor="send-time">
          Delivery time
        </label>
        <input
          id="send-time"
          className="field-input"
          type="time"
          required
          value={sendTime}
          onChange={(e) => setSendTime(e.target.value)}
        />
      </div>

      <div className="field-group">
        <label className="field-label" htmlFor="timezone">
          Timezone
        </label>
        <select
          id="timezone"
          className="field-input field-select"
          value={timezone}
          onChange={(e) => setTimezone(e.target.value)}
        >
          {timezones.map((tz) => (
            <option key={tz} value={tz}>
              {tz}
            </option>
          ))}
        </select>
      </div>

      {mode === "edit" && (
        <div className="field-group">
          <label className="field-checkbox">
            <input type="checkbox" checked={enabled} onChange={(e) => setEnabled(e.target.checked)} />
            Email delivery enabled
          </label>
        </div>
      )}

      {daysValid && <p className="schedule-summary">{formatScheduleSummary({ days, sendTime, timezone })}</p>}

      <div className="form-actions">
        <button type="submit" className="btn-primary" disabled={!daysValid || status === "saving"}>
          {mode === "edit" ? "Save changes" : "Get Sift by email"}
        </button>
        {mode === "edit" && (
          <button type="button" className="btn-secondary" onClick={handleUnsubscribe} disabled={status === "saving"}>
            Unsubscribe
          </button>
        )}
      </div>

      {status === "saved" && (
        <p className="form-message">
          {mode === "edit"
            ? "Saved. A confirmation email is on its way."
            : "Check your inbox — we've sent a confirmation with a link to manage or cancel this anytime."}
        </p>
      )}
      {status === "unsubscribed" && <p className="form-message">Unsubscribed. You can turn delivery back on any time from this page.</p>}
      {status === "error" && <p className="form-message is-error">{errorMessage}</p>}
    </form>
  );
}
