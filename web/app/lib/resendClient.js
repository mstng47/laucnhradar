import { Resend } from "resend";

// Same env vars as the root project's scripts/lib/resendClient.mjs, set
// separately here because the website is a different deployment (Vercel)
// than the pipeline (GitHub Actions) - see MANUAL_STEPS.md.
const FROM_ADDRESS = process.env.SIFT_FROM_ADDRESS || "Sift <onboarding@resend.dev>";

async function sendEmail({ to, subject, html, text }) {
  if (!process.env.RESEND_API_KEY) {
    // Preferences are already saved in Supabase by this point - a missing
    // key here means the confirmation email doesn't go out, not that the
    // signup itself failed, so this warns rather than throwing.
    console.warn("RESEND_API_KEY not set - skipping confirmation email.");
    return;
  }
  try {
    const resend = new Resend(process.env.RESEND_API_KEY);
    const { error } = await resend.emails.send({ from: FROM_ADDRESS, to, subject, html, text });
    if (error) console.warn(`Confirmation email failed: ${error.message ?? JSON.stringify(error)}`);
  } catch (err) {
    // The caller (subscribe/unsubscribe routes) has already saved the
    // subscriber's preferences by this point - a network error or thrown
    // exception talking to Resend must never turn that already-successful
    // save into a reported failure. Caught here, not just left to the
    // caller's own try/catch, so this is a dead end no matter who calls it.
    console.warn(`Confirmation email threw: ${err.message}`);
  }
}

export { sendEmail };
