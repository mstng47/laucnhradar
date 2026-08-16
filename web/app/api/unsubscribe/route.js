import { NextResponse } from "next/server";
import { getSupabaseAdminClient } from "../../supabaseAdmin";

// One endpoint, two callers: the "Unsubscribe" button on /email (a fetch
// call from the browser) and mail clients doing an RFC 8058 one-click
// unsubscribe (Gmail/Yahoo's own "Unsubscribe" affordance next to the
// sender, triggered by the List-Unsubscribe headers on the daily email —
// see scripts/lib/resendClient.mjs). Both just POST here with the token
// in the query string; neither needs a body.
export async function POST(request) {
  try {
    const token = new URL(request.url).searchParams.get("token");
    if (!token) return NextResponse.json({ error: "Missing token." }, { status: 400 });

    const supabase = getSupabaseAdminClient();
    const { data, error } = await supabase
      .from("email_subscribers")
      .update({ enabled: false, updated_at: new Date().toISOString() })
      .eq("manage_token", token)
      .select()
      .maybeSingle();

    if (error) return NextResponse.json({ error: "Something went wrong. Try again." }, { status: 500 });
    if (!data) return NextResponse.json({ error: "That link has expired or is invalid." }, { status: 404 });

    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("unsubscribe failed:", err);
    return NextResponse.json({ error: "Something went wrong. Try again." }, { status: 500 });
  }
}
