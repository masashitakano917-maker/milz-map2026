import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

const HOME_URL = "https://milz-map.com";
const GAS_WEBHOOK_URL = "https://script.google.com/macros/s/AKfycbw5UKkeQsmlNpkeaioaNdIF4_UtOiFf4x69qI2FUCCUt9gd7-z6ckkbWWrwcWxqTZnq/exec";
const GAS_SECRET = "Mz8vX2qRkT9wY4pB3nH7jL1sD6fGcV5aQeU0oI8yK2mN4bC6xZ3rW9tE1hP5uJ7d";

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 200, headers: corsHeaders });
  }

  try {
    const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
    const SUPABASE_ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY")!;
    const SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

    let userId = "";
    let email = "";

    const authHeader = req.headers.get("Authorization") || "";
    const accessToken = authHeader.replace("Bearer ", "").trim();

    const bodyIn = await req.json().catch(() => ({}));

    if (accessToken && accessToken !== SUPABASE_ANON_KEY) {
      const userClient = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
        global: { headers: { Authorization: `Bearer ${accessToken}` } },
      });
      const { data: userData } = await userClient.auth.getUser();
      if (userData?.user) {
        userId = userData.user.id;
        email = userData.user.email || "";
      }
    }

    if (!userId && bodyIn?.email) {
      const admin = createClient(SUPABASE_URL, SERVICE_ROLE_KEY);
      const { data: list } = await admin.auth.admin.listUsers();
      const match = list?.users?.find((u) => (u.email || "").toLowerCase() === String(bodyIn.email).toLowerCase());
      if (match) {
        userId = match.id;
        email = match.email || bodyIn.email;
      }
    }

    if (!userId || !email) {
      return json({ error: "Cannot resolve user", hasAuth: !!accessToken }, 401);
    }

    const admin = createClient(SUPABASE_URL, SERVICE_ROLE_KEY);

    const { data: tokenRow, error: tokenErr } = await admin
      .from("email_verification_tokens")
      .insert({ user_id: userId, email })
      .select("token")
      .maybeSingle();

    if (tokenErr || !tokenRow) {
      return json({ error: "Failed to create token", detail: tokenErr?.message }, 500);
    }

    const verifyUrl = `${HOME_URL}/verify?token=${tokenRow.token}`;

    let gasStatus = 0;
    let gasBody = "";
    try {
      const gasRes = await fetch(GAS_WEBHOOK_URL, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        redirect: "follow",
        body: JSON.stringify({
          secret: GAS_SECRET,
          email,
          user_id: userId,
          verify_url: verifyUrl,
          timestamp: new Date().toISOString(),
        }),
      });
      gasStatus = gasRes.status;
      gasBody = await gasRes.text();
      console.log("GAS response", gasStatus, gasBody);
    } catch (gasErr) {
      console.error("GAS webhook failed", gasErr);
      return json({ error: "GAS call failed", detail: String(gasErr) }, 500);
    }

    return json({ ok: true, gas_status: gasStatus, gas_body: gasBody });
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
