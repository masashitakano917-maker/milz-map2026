import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 200, headers: corsHeaders });
  }

  try {
    const url = new URL(req.url);
    let token = url.searchParams.get("token") || "";
    if (!token && req.method === "POST") {
      try {
        const body = await req.json();
        token = body?.token || "";
      } catch { /* ignore */ }
    }
    if (!token) {
      return json({ ok: false, error: "Missing token" }, 400);
    }

    const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
    const SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const admin = createClient(SUPABASE_URL, SERVICE_ROLE_KEY);

    const { data: row, error: selErr } = await admin
      .from("email_verification_tokens")
      .select("token, user_id, email, expires_at, verified_at")
      .eq("token", token)
      .maybeSingle();

    if (selErr) {
      return json({ ok: false, error: "Lookup failed" }, 500);
    }
    if (!row) {
      return json({ ok: false, error: "Invalid token" }, 404);
    }
    if (row.verified_at) {
      return json({ ok: true, already: true, email: row.email });
    }
    if (new Date(row.expires_at).getTime() < Date.now()) {
      return json({ ok: false, error: "Token expired" }, 410);
    }

    const { error: updErr } = await admin
      .from("email_verification_tokens")
      .update({ verified_at: new Date().toISOString() })
      .eq("token", token);
    if (updErr) {
      return json({ ok: false, error: "Update failed" }, 500);
    }

    const { error: profErr } = await admin
      .from("profiles")
      .update({ email_verified: true })
      .eq("id", row.user_id);
    if (profErr) {
      console.error("profiles update failed", profErr);
    }

    return json({ ok: true, email: row.email });
  } catch (err) {
    console.error("verify-email error", err);
    return json({ ok: false, error: (err as Error).message }, 500);
  }
});

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}
