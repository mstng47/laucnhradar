import Link from "next/link";
import ContentFrame from "../components/ContentFrame";
import PageIntro from "../components/PageIntro";
import EmailPreferencesForm from "../components/EmailPreferencesForm";
import { getSupabaseAdminClient } from "../supabaseAdmin";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "Get Sift by email · Sift",
  description: "Have the daily briefing land in your inbox on your own schedule.",
};

// With no ?token, this is the public signup form. With one (every daily
// email and confirmation email links back here with it), it looks up
// that subscriber server-side — using the service_role client, since
// email_subscribers has no public RLS policy — and renders the same form
// pre-filled for editing instead.
export default async function Email({ searchParams }) {
  const { token } = await searchParams;

  let subscriber = null;
  let loadError = null;

  if (token) {
    try {
      const supabase = getSupabaseAdminClient();
      const { data, error } = await supabase
        .from("email_subscribers")
        .select("*")
        .eq("manage_token", token)
        .maybeSingle();
      if (error) throw new Error(error.message);
      if (!data) loadError = "That link has expired or is invalid.";
      subscriber = data;
    } catch (err) {
      loadError = err.message;
    }
  }

  return (
    <ContentFrame>
      <p className="back-row container">
        <Link href="/" className="back-link">
          ← Today&apos;s briefing
        </Link>
      </p>

      <PageIntro eyebrow={token ? "Manage your schedule" : "Get Sift by email"} />
      <main className="container">
        {loadError && <p className="error">{loadError}</p>}

        {!token && !loadError && (
          <p className="stub-copy">
            Choose which days, what time and which timezone — Sift will land in your inbox
            instead of (or alongside) the website.
          </p>
        )}

        {!loadError && (
          <EmailPreferencesForm
            mode={subscriber ? "edit" : "create"}
            token={token}
            initial={
              subscriber
                ? {
                    email: subscriber.email,
                    days: subscriber.days,
                    sendTime: subscriber.send_time?.slice(0, 5),
                    timezone: subscriber.timezone,
                    enabled: subscriber.enabled,
                  }
                : null
            }
          />
        )}
      </main>
    </ContentFrame>
  );
}
