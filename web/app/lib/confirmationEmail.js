import { formatScheduleSummary } from "./emailPreferences";

// Sent right after a signup or preferences edit — not the daily briefing
// itself (that template lives in the root project's
// scripts/lib/emailTemplate.mjs, a separate deployment). Deliberately
// short: this exists to (a) prove the address is real by landing in an
// actual inbox, since there's no separate email-verification step, and
// (b) hand over the manage link, which is otherwise never shown on-page.
const COLOR = { bg: "#f8f5ed", text: "#16171c", textSoft: "#53565f", hairline: "#ddd6c7", teal: "#0c7a84" };
const FONT = "ui-monospace, 'Cascadia Mono', 'SFMono-Regular', Consolas, 'Liberation Mono', Menlo, monospace";

function buildConfirmationEmail({ subscriber, siteUrl }) {
  const manageUrl = `${siteUrl}/email?token=${subscriber.manage_token}`;
  const summary = formatScheduleSummary(subscriber);
  const statusLine = subscriber.enabled
    ? `Sift will land in your inbox: ${summary}.`
    : "Email delivery is currently paused for this address.";

  const html = `<!doctype html>
<html>
  <body style="margin:0;padding:0;background:${COLOR.bg};">
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:${COLOR.bg};padding:32px 0;">
      <tr><td align="center">
        <table role="presentation" width="480" cellpadding="0" cellspacing="0" style="width:480px;max-width:90%;">
          <tr><td style="font-family:${FONT};font-size:22px;font-weight:700;color:${COLOR.text};padding-bottom:6px;">Sift</td></tr>
          <tr><td style="height:3px;background:${COLOR.text};"></td></tr>
          <tr><td style="height:1px;background:${COLOR.text};margin-bottom:20px;"></td></tr>
          <tr><td style="font-family:${FONT};font-size:15px;color:${COLOR.text};line-height:1.6;padding-top:20px;">${statusLine}</td></tr>
          <tr><td style="font-family:${FONT};font-size:13px;color:${COLOR.textSoft};padding-top:18px;border-top:1px solid ${COLOR.hairline};margin-top:18px;">
            <a href="${manageUrl}" style="color:${COLOR.teal};text-decoration:none;">Change your schedule or unsubscribe →</a>
          </td></tr>
        </table>
      </td></tr>
    </table>
  </body>
</html>`;

  const text = `${statusLine}\n\nChange your schedule or unsubscribe: ${manageUrl}`;

  return { subject: "Your Sift email schedule", html, text };
}

export { buildConfirmationEmail };
