// The daily briefing, reshaped for an inbox. Table-based layout and inline
// styles throughout — email clients (Outlook especially) strip <style>
// blocks and don't reliably load webfonts, so this can't just reuse
// globals.css. What it CAN reuse is the exact palette: same cream/near-
// black/teal/hairline hex values as the site, so it still reads as the
// same publication, not a generic newsletter wearing Sift's name.

const COLOR = {
  bg: "#f8f5ed",
  surface: "#ffffff",
  text: "#16171c",
  textSoft: "#53565f",
  hairline: "#ddd6c7",
  teal: "#0c7a84",
  chromeBg: "#0b1220",
  chromeText: "#f8f4ec",
};

// System monospace stack only — no Google Fonts import. Most inboxes
// (Outlook in particular) block external font requests or strip them
// outright, so a webfont here would just silently fall back anyway; this
// skips the failed request rather than depending on one.
const FONT =
  "ui-monospace, 'Cascadia Mono', 'SFMono-Regular', Consolas, 'Liberation Mono', Menlo, monospace";

function escapeHtml(str) {
  return String(str ?? "").replace(/[&<>"']/g, (c) => ({
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '"': "&quot;",
    "'": "&#39;",
  })[c]);
}

function formatDateLong(digestDate) {
  const [y, m, d] = digestDate.split("-").map(Number);
  return new Intl.DateTimeFormat("en-GB", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
    timeZone: "UTC",
  }).format(new Date(Date.UTC(y, m - 1, d)));
}

function storyBlockHtml(entry, index, total) {
  return `
    <tr><td style="padding:22px 0;border-top:1px solid ${COLOR.hairline};">
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
        <tr>
          <td style="font-family:${FONT};font-size:13px;font-weight:700;color:${COLOR.teal};padding-bottom:8px;">
            ${String(index).padStart(2, "0")} / ${String(total).padStart(2, "0")}
          </td>
        </tr>
        <tr>
          <td style="font-family:${FONT};font-size:19px;font-weight:700;color:${COLOR.text};line-height:1.35;padding-bottom:10px;">
            <a href="${escapeHtml(entry.url)}" style="color:${COLOR.text};text-decoration:none;">${escapeHtml(entry.headline)}</a>
          </td>
        </tr>
        <tr>
          <td style="font-family:${FONT};font-size:15px;color:${COLOR.textSoft};line-height:1.6;padding-bottom:14px;">
            ${escapeHtml(entry.what_happened)}
          </td>
        </tr>
        ${
          entry.why_it_matters
            ? `<tr><td style="border-left:2px solid ${COLOR.teal};padding:2px 0 2px 14px;">
                 <div style="font-family:${FONT};font-size:11px;font-weight:700;letter-spacing:0.08em;color:${COLOR.teal};text-transform:uppercase;padding-bottom:5px;">Why it matters</div>
                 <div style="font-family:${FONT};font-size:15px;color:${COLOR.text};line-height:1.6;">${escapeHtml(entry.why_it_matters)}</div>
               </td></tr>`
            : ""
        }
        <tr>
          <td style="font-family:${FONT};font-size:12px;font-weight:700;letter-spacing:0.05em;color:${COLOR.textSoft};text-transform:uppercase;padding-top:14px;">
            ${escapeHtml(entry.source)}${Number.isFinite(entry.article_read_minutes) ? ` &middot; ${entry.article_read_minutes} min` : ""}
            &nbsp;&rarr;
          </td>
        </tr>
      </table>
    </td></tr>`;
}

function compactSectionHtml(title, entries) {
  if (entries.length === 0) return "";
  const rows = entries
    .map(
      (e) => `
      <tr><td style="padding:12px 0;border-top:1px solid ${COLOR.hairline};">
        <a href="${escapeHtml(e.url)}" style="font-family:${FONT};font-size:15px;font-weight:700;color:${COLOR.text};text-decoration:none;">${escapeHtml(e.headline)}</a>
        <div style="font-family:${FONT};font-size:11px;font-weight:700;letter-spacing:0.05em;color:${COLOR.textSoft};text-transform:uppercase;padding:4px 0 6px;">${escapeHtml(e.source)}</div>
        <div style="font-family:${FONT};font-size:14px;color:${COLOR.textSoft};line-height:1.6;">${escapeHtml(e.what_happened)}</div>
      </td></tr>`
    )
    .join("");
  return `
    <tr><td style="padding:26px 0 4px;">
      <div style="font-family:${FONT};font-size:12px;font-weight:700;letter-spacing:0.07em;color:${COLOR.textSoft};text-transform:uppercase;">${escapeHtml(title)}</div>
    </td></tr>
    <tr><td><table role="presentation" width="100%" cellpadding="0" cellspacing="0">${rows}</table></td></tr>`;
}

// { subscriber, digestDate, main, launches, also, siteUrl } -> { subject, html, text }
function buildBriefingEmail({ subscriber, digestDate, main, launches, also, siteUrl }) {
  const dateLabel = formatDateLong(digestDate);
  const manageUrl = `${siteUrl}/email?token=${subscriber.manage_token}`;
  const readOnlineUrl = `${siteUrl}/archive/${digestDate}`;

  const storiesHtml = main
    .map((entry, i) => storyBlockHtml(entry, i + 1, main.length))
    .join("");

  const html = `<!doctype html>
<html>
  <body style="margin:0;padding:0;background:${COLOR.chromeBg};">
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:${COLOR.chromeBg};padding:24px 0;">
      <tr><td align="center">
        <table role="presentation" width="600" cellpadding="0" cellspacing="0" style="width:600px;max-width:92%;background:${COLOR.bg};">
          <tr><td style="padding:28px 28px 0;">
            <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
              <tr>
                <td style="font-family:${FONT};font-size:26px;font-weight:700;color:${COLOR.text};">Sift</td>
                <td align="right" style="font-family:${FONT};font-size:11px;font-weight:700;letter-spacing:0.06em;color:${COLOR.textSoft};text-transform:uppercase;">${escapeHtml(dateLabel)}</td>
              </tr>
            </table>
            <div style="height:3px;background:${COLOR.text};margin-top:14px;"></div>
            <div style="height:1px;background:${COLOR.text};margin-top:4px;"></div>
          </td></tr>
          <tr><td style="padding:0 28px;">
            <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
              ${storiesHtml}
              ${compactSectionHtml("New launches", launches)}
              ${compactSectionHtml("Also worth knowing", also)}
            </table>
          </td></tr>
          <tr><td style="padding:26px 28px 28px;border-top:1px solid ${COLOR.hairline};margin-top:20px;">
            <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin-top:20px;">
              <tr><td style="font-family:${FONT};font-size:13px;color:${COLOR.textSoft};padding-bottom:10px;">
                <a href="${escapeHtml(readOnlineUrl)}" style="color:${COLOR.teal};text-decoration:none;">Read this issue on the web &rarr;</a>
              </td></tr>
              <tr><td style="font-family:${FONT};font-size:12px;color:${COLOR.textSoft};">
                Sent because you asked Sift to email you.
                <a href="${escapeHtml(manageUrl)}" style="color:${COLOR.textSoft};text-decoration:underline;">Change schedule or unsubscribe</a>
              </td></tr>
            </table>
          </td></tr>
        </table>
      </td></tr>
    </table>
  </body>
</html>`;

  const textLines = [
    `SIFT — ${dateLabel}`,
    "",
    ...main.map(
      (e, i) =>
        `${String(i + 1).padStart(2, "0")}/${String(main.length).padStart(2, "0")} ${e.headline}\n${e.what_happened}${
          e.why_it_matters ? `\nWhy it matters: ${e.why_it_matters}` : ""
        }\n${e.url}\n`
    ),
    launches.length > 0 ? "NEW LAUNCHES\n" + launches.map((e) => `- ${e.headline} (${e.source}): ${e.what_happened}`).join("\n") + "\n" : "",
    also.length > 0 ? "ALSO WORTH KNOWING\n" + also.map((e) => `- ${e.headline} (${e.source}): ${e.what_happened}`).join("\n") + "\n" : "",
    `Read online: ${readOnlineUrl}`,
    `Change schedule or unsubscribe: ${manageUrl}`,
  ];

  return {
    subject: `Sift — ${main[0]?.headline ?? dateLabel}`,
    html,
    text: textLines.filter(Boolean).join("\n"),
  };
}

export { buildBriefingEmail };
