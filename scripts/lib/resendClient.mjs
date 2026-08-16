import { Resend } from "resend";

// "Sift <sift@SIFT_FROM_DOMAIN>" once a domain is verified in Resend (see
// MANUAL_STEPS.md) — falls back to Resend's own shared test domain so
// nothing crashes before that's set up, though Resend will only actually
// deliver from that fallback to your own Resend account email.
const FROM_ADDRESS = process.env.SIFT_FROM_ADDRESS || "Sift <onboarding@resend.dev>";

function getResendClient() {
  if (!process.env.RESEND_API_KEY) return null;
  return new Resend(process.env.RESEND_API_KEY);
}

// unsubscribeUrl gets the RFC 8058 one-click headers (Gmail/Yahoo surface
// their own "Unsubscribe" affordance next to the sender when these are
// present, separate from and in addition to the footer link in the body).
async function sendEmail({ to, subject, html, text, unsubscribeUrl }) {
  const resend = getResendClient();
  if (!resend) throw new Error("RESEND_API_KEY not set — can't send email.");

  const { error } = await resend.emails.send({
    from: FROM_ADDRESS,
    to,
    subject,
    html,
    text,
    headers: unsubscribeUrl
      ? {
          "List-Unsubscribe": `<${unsubscribeUrl}>`,
          "List-Unsubscribe-Post": "List-Unsubscribe=One-Click",
        }
      : undefined,
  });

  if (error) throw new Error(`Resend send failed: ${error.message ?? JSON.stringify(error)}`);
}

export { sendEmail };
