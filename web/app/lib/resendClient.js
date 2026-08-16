import { Resend } from "resend";

// Same env vars as the root project's scripts/lib/resendClient.mjs, set
// separately here because the website is a different deployment (Vercel)
// than the pipeline (GitHub Actions) — see MANUAL_STEPS.md.
const FROM_ADDRESS = process.env.SIFT_FROM_ADDRESS || "Sift <onboarding@resend.dev>";

async function sendEmail({ to, subject, html, text }) {
  if (!process.env.RESEND_API_KEY) {
    // Preferences are already saved in Supabase by this point — a missing
    // key here means the confirmation email doesn't go out, not that the
    // signup itself failed, so this warns rather than throwing.
    console.warn("RESEND_API_KEY not set — skipping confirmation email.");
    return;
  }
  const resend = new Resend(process.env.RESEND_API_KEY);
  const { error } = await resend.emails.send({ from: FROM_ADDRESS, to, subject, html, text });
  if (error) console.warn(`Confirmation email failed: ${error.message ?? JSON.stringify(error)}`);
}

export { sendEmail };
