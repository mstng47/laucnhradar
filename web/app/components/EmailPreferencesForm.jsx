"use client";

import { useMemo, useState } from "react";
import {
  DAY_SHORT,
  formatScheduleSummary,
  formatTimeLabel,
  buildTimeOptions,
  buildTimezoneOptions,
} from "../lib/emailPreferences";

// Displayed Monday-first (the usual week view) even though the value
// stored and sent is still 0=Sunday..6=Saturday everywhere else - this is
// the one place that ordering gets flipped, purely for how the buttons
// lay out on screen.
const DISPLAY_ORDER = [1, 2, 3, 4, 5, 6, 0];

// Built once per page load, not per render - both lists are a fixed size
// (288 five-minute steps; ~25 timezone offsets) and the timezone list only
// needs to reflect "now" once, not on every keystroke.
const TIME_OPTIONS = buildTimeOptions();
const TIMEZONE_OPTIONS = buildTimezoneOptions();
const TIMEZONE_LABEL_BY_ZONE = new Map(TIMEZONE_OPTIONS.map((o) => [o.value, o.label]));
const TIMEZONE_ZONE_BY_LABEL = new Map(TIMEZONE_OPTIONS.map((o) => [o.label, o.value]));

function guessTimezone() {
  try {
    return Intl.DateTimeFormat().resolvedOptions().timeZone || "UTC";
  } catch {
    return "UTC";
  }
}

// mode: "create" (blank signup form) or "edit" (prefilled from a token -
// see web/app/email/page.jsx). initial holds whatever the page already
// knows: nothing for create, the subscriber's saved row for edit.
export default function EmailPreferencesForm({ mode, token, initial }) {
  const [email, setEmail] = useState(initial?.email ?? "");
  const [days, setDays] = useState(initial?.days ?? [1, 2, 3, 4, 5]);
  const [sendTime, setSendTime] = useState(initial?.sendTime ?? "07:30");
  const [timezone, setTimezone] = useState(initial?.timezone ?? guessTimezone());
  // The searchable timezone field is text the user types, which only
  // becomes the real `timezone` value once it exactly matches a known
  // option (see handleTimezoneInput/Blur below) - kept separate so a
  // half-typed search ("Lon...") doesn't briefly become an invalid
  // timezone value.
  const [tzQuery, setTzQuery] = useState(TIMEZONE_LABEL_BY_ZONE.get(timezone) ?? timezone);
  const [enabled, setEnabled] = useState(initial?.enabled ?? true);
  const [status, setStatus] = useState("idle"); // idle | saving | saved | error | unsubscribed
  const [errorMessage, setErrorMessage] = useState("");

  // A subscriber saved before this change (or on an odd browser default)
  // may have a time that doesn't land on a 5-minute mark - keep it
  // selectable rather than silently snapping their saved setting to the
  // nearest option.
  const timeOptions = useMemo(() => {
    if (TIME_OPTIONS.some((o) => o.value === sendTime)) return TIME_OPTIONS;
    return [{ value: sendTime, label: formatTimeLabel(sendTime) }, ...TIME_OPTIONS];
  }, [sendTime]);

  function handleTimezoneInput(e) {
    const value = e.target.value;
    setTzQuery(value);
    const zone = TIMEZONE_ZONE_BY_LABEL.get(value);
    if (zone) setTimezone(zone);
  }

  function handleTimezoneBlur() {
    const zone = TIMEZONE_ZONE_BY_LABEL.get(tzQuery);
    if (zone) {
      setTimezone(zone);
      return;
    }
    // Typed text didn't match a real option - fall back to whatever the
    // last valid timezone was rather than leave a dangling, unsaveable
    // value in the box.
    setTzQuery(TIMEZONE_LABEL_BY_ZONE.get(timezone) ?? timezone);
  }

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
        <select
          id="send-time"
          className="field-input field-select field-select-time"
          required
          value={sendTime}
          onChange={(e) => setSendTime(e.target.value)}
        >
          {timeOptions.map((opt) => (
            <option key={opt.value} value={opt.value}>
              {opt.label}
            </option>
          ))}
        </select>
      </div>

      <div className="field-group">
        <label className="field-label" htmlFor="timezone">
          Timezone
        </label>
        <input
          id="timezone"
          className="field-input"
          type="text"
          list="timezone-options"
          autoComplete="off"
          placeholder="Start typing a city..."
          value={tzQuery}
          onChange={handleTimezoneInput}
          onBlur={handleTimezoneBlur}
        />
        <datalist id="timezone-options">
          {TIMEZONE_OPTIONS.map((opt) => (
            <option key={opt.value} value={opt.label} />
          ))}
        </datalist>
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
        <button type="submit" className="btn-primary" disabled={!daysValid || status === "saving"} aria-busy={status === "saving"}>
          {status === "saving" ? "Saving..." : mode === "edit" ? "Save changes" : "Get Sift by email"}
        </button>
        {mode === "edit" && (
          <button type="button" className="btn-secondary" onClick={handleUnsubscribe} disabled={status === "saving"}>
            Unsubscribe
          </button>
        )}
      </div>

      <div aria-live="polite">
        {status === "saved" && (
          <p className="form-message">
            {mode === "edit"
              ? "Saved. A confirmation email is on its way."
              : "Check your inbox - we've sent a confirmation with a link to manage or cancel this anytime."}
          </p>
        )}
        {status === "unsubscribed" && <p className="form-message">Unsubscribed. You can turn delivery back on any time from this page.</p>}
        {status === "error" && <p className="form-message is-error">{errorMessage}</p>}
      </div>
    </form>
  );
}
