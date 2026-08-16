import { NextResponse } from "next/server";
import { getSupabaseAdminClient } from "../../supabaseAdmin";
import { isValidEmail, validatePreferences } from "../../lib/emailPreferences";
import { sendEmail } from "../../lib/resendClient";
import { buildConfirmationEmail } from "../../lib/confirmationEmail";

function siteUrl(request) {
  return process.env.SITE_URL || new URL(request.url).origin;
}

async function notifySubscriber(subscriber, request) {
  const { subject, html, text } = buildConfirmationEmail({ subscriber, siteUrl: siteUrl(request) });
  await sendEmail({ to: subscriber.email, subject, html, text });
}

// Creates a new subscriber, or (with a `token`) edits an existing one's
// schedule. Deliberately does NOT let a bare email in the request body
// overwrite an existing subscriber's preferences — there's no email
// verification step, so anyone could type in someone else's address.
// Submitting an already-subscribed email just re-sends that address its
// own manage link, so only the real owner (who opens their inbox) can
// actually change anything.
export async function POST(request) {
  try {
    return await handleSubscribe(request);
  } catch (err) {
    // Catches getSupabaseAdminClient() throwing on a missing
    // SUPABASE_SERVICE_ROLE_KEY (see MANUAL_STEPS.md) as much as any
    // unexpected Supabase/network failure — either way, the person
    // filling out the form gets a message, not a raw 500 page.
    console.error("subscribe failed:", err);
    return NextResponse.json({ error: "Something went wrong. Try again." }, { status: 500 });
  }
}

async function handleSubscribe(request) {
  const body = await request.json().catch(() => null);
  if (!body) return NextResponse.json({ error: "Invalid request." }, { status: 400 });

  const validation = validatePreferences(body);
  if (validation.error) return NextResponse.json({ error: validation.error }, { status: 400 });
  const { days, sendTime, timezone } = validation.value;
  const enabled = body.enabled !== false;

  const supabase = getSupabaseAdminClient();

  if (body.token) {
    const { data: existing, error: findError } = await supabase
      .from("email_subscribers")
      .select("*")
      .eq("manage_token", body.token)
      .maybeSingle();
    if (findError) return NextResponse.json({ error: "Something went wrong. Try again." }, { status: 500 });
    if (!existing) return NextResponse.json({ error: "That link has expired or is invalid." }, { status: 404 });

    const { data: updated, error: updateError } = await supabase
      .from("email_subscribers")
      .update({ days, send_time: sendTime, timezone, enabled, updated_at: new Date().toISOString() })
      .eq("id", existing.id)
      .select()
      .single();
    if (updateError) return NextResponse.json({ error: "Something went wrong. Try again." }, { status: 500 });

    await notifySubscriber(updated, request);
    return NextResponse.json({ ok: true });
  }

  const email = typeof body.email === "string" ? body.email.trim().toLowerCase() : "";
  if (!isValidEmail(email)) return NextResponse.json({ error: "Enter a valid email address." }, { status: 400 });

  const { data: existing, error: lookupError } = await supabase
    .from("email_subscribers")
    .select("*")
    .eq("email", email)
    .maybeSingle();
  if (lookupError) return NextResponse.json({ error: "Something went wrong. Try again." }, { status: 500 });

  if (existing) {
    await notifySubscriber(existing, request);
    return NextResponse.json({ ok: true });
  }

  const { data: created, error: insertError } = await supabase
    .from("email_subscribers")
    .insert({ email, days, send_time: sendTime, timezone, enabled })
    .select()
    .single();
  if (insertError) return NextResponse.json({ error: "Something went wrong. Try again." }, { status: 500 });

  await notifySubscriber(created, request);
  return NextResponse.json({ ok: true });
}
