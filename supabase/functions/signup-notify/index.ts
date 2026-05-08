import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

const HOME_URL = "https://milz-map.com";

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 200, headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get("Authorization") || "";
    const accessToken = authHeader.replace("Bearer ", "").trim();
    if (!accessToken) {
      return json({ error: "Missing Authorization header" }, 401);
    }

    const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
    const SUPABASE_ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY")!;
    const SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const GAS_WEBHOOK_URL = Deno.env.get("GAS_WEBHOOK_URL") || "";
    const GAS_SECRET = Deno.env.get("GAS_SECRET") || "";

    const userClient = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
      global: { headers: { Authorization: `Bearer ${accessToken}` } },
    });
    const { data: userData, error: userErr } = await userClient.auth.getUser();
    if (userErr || !userData?.user) {
      return json({ error: "Invalid session" }, 401);
    }
    const user = userData.user;
    const email = user.email || "";
    if (!email) {
      return json({ error: "User has no email" }, 400);
    }

    const admin = createClient(SUPABASE_URL, SERVICE_ROLE_KEY);

    const { data: tokenRow, error: tokenErr } = await admin
      .from("email_verification_tokens")
      .insert({ user_id: user.id, email })
      .select("token")
      .maybeSingle();

    if (tokenErr || !tokenRow) {
      return json({ error: "Failed to create token", detail: tokenErr?.message }, 500);
    }

    const verifyUrl = `${HOME_URL}/verify?token=${tokenRow.token}`;

    if (GAS_WEBHOOK_URL) {
      try {
        await fetch(GAS_WEBHOOK_URL, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            secret: GAS_SECRET,
            email,
            user_id: user.id,
            verify_url: verifyUrl,
            timestamp: new Date().toISOString(),
          }),
        });
      } catch (gasErr) {
        console.error("GAS webhook failed", gasErr);
      }
    } else {
      console.warn("GAS_WEBHOOK_URL not configured");
    }

    return json({ ok: true });
  } catch (err) {
    console.error("signup-notify error", err);
    return json({ error: (err as Error).message }, 500);
  }
});

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}
