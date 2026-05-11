import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2.101.1";
import { GoogleGenAI } from "npm:@google/genai@1.48.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

type FieldMap = Record<string, string>;

const TRANSLATABLE_FIELDS = [
  "name",
  "description",
  "detailed_description",
  "milz_experience",
  "address",
  "hours",
  "hours_label",
  "shorts_heading",
  "from_spot_heading",
  "from_spot_intro",
] as const;

function languageName(locale: string): string {
  switch (locale) {
    case "en":
      return "English";
    case "jp":
    case "ja":
      return "Japanese";
    default:
      return locale;
  }
}

async function geminiTranslate(
  ai: GoogleGenAI,
  payload: FieldMap,
  targetLocale: string,
): Promise<FieldMap> {
  if (Object.keys(payload).length === 0) return {};

  const target = languageName(targetLocale);
  const prompt = `Translate the following JSON values into natural, fluent ${target}.
Rules:
- Preserve the JSON structure and keys exactly.
- Only translate the VALUES.
- Keep proper nouns (station, brand, shop names) recognizable; use their common ${target} spelling when one exists.
- For addresses, produce a clean ${target} address string.
- Do NOT add commentary. Return ONLY valid JSON.

Input:
${JSON.stringify(payload, null, 2)}

Output JSON:`;

  const response = await ai.models.generateContent({
    model: "gemini-3-flash-preview",
    contents: prompt,
    config: { temperature: 0.2, responseMimeType: "application/json" },
  });

  const text = response.text ?? "";
  const cleaned = text.trim().replace(/^```json\s*/i, "").replace(/```$/i, "").trim();

  try {
    const parsed = JSON.parse(cleaned);
    const out: FieldMap = {};
    for (const key of Object.keys(payload)) {
      if (typeof parsed[key] === "string") out[key] = parsed[key];
    }
    return out;
  } catch {
    return {};
  }
}

async function translateFromSpotItems(
  ai: GoogleGenAI,
  items: any[],
  targetLocale: string,
): Promise<any[]> {
  if (!Array.isArray(items) || items.length === 0) return items;

  const payload: Record<string, string> = {};
  items.forEach((item, idx) => {
    if (item && typeof item === "object") {
      if (typeof item.title === "string" && item.title.trim()) payload[`title_${idx}`] = item.title;
      if (typeof item.subtitle === "string" && item.subtitle.trim()) payload[`subtitle_${idx}`] = item.subtitle;
      if (typeof item.description === "string" && item.description.trim()) payload[`description_${idx}`] = item.description;
      if (typeof item.body === "string" && item.body.trim()) payload[`body_${idx}`] = item.body;
      if (typeof item.comment === "string" && item.comment.trim()) payload[`comment_${idx}`] = item.comment;
      if (typeof item.reporter === "string" && item.reporter.trim()) payload[`reporter_${idx}`] = item.reporter;
    }
  });

  if (Object.keys(payload).length === 0) return items;

  const translated = await geminiTranslate(ai, payload, targetLocale);

  return items.map((item, idx) => {
    if (!item || typeof item !== "object") return item;
    const next = { ...item };
    if (translated[`title_${idx}`]) next.title = translated[`title_${idx}`];
    if (translated[`subtitle_${idx}`]) next.subtitle = translated[`subtitle_${idx}`];
    if (translated[`description_${idx}`]) next.description = translated[`description_${idx}`];
    if (translated[`body_${idx}`]) next.body = translated[`body_${idx}`];
    if (translated[`comment_${idx}`]) next.comment = translated[`comment_${idx}`];
    if (translated[`reporter_${idx}`]) next.reporter = translated[`reporter_${idx}`];
    return next;
  });
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 200, headers: corsHeaders });
  }

  try {
    if (req.method !== "POST") {
      return new Response(JSON.stringify({ error: "Method not allowed" }), {
        status: 405,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const apiKey = Deno.env.get("GEMINI_API_KEY");
    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
    if (!apiKey || !supabaseUrl || !serviceKey) {
      return new Response(JSON.stringify({ error: "Server is missing configuration" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { place_id, target_locale } = await req.json();
    if (!place_id || !target_locale) {
      return new Response(JSON.stringify({ error: "place_id and target_locale required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabase = createClient(supabaseUrl, serviceKey);

    const { data: cached } = await supabase
      .from("place_translations")
      .select("fields, updated_at")
      .eq("place_id", place_id)
      .eq("locale", target_locale)
      .maybeSingle();

    if (cached && cached.fields && Object.keys(cached.fields).length > 0) {
      return new Response(JSON.stringify({ fields: cached.fields, cached: true }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { data: place, error: placeErr } = await supabase
      .from("admin_places")
      .select("*")
      .eq("id", place_id)
      .maybeSingle();

    if (placeErr || !place) {
      return new Response(JSON.stringify({ error: "Place not found" }), {
        status: 404,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const toTranslate: FieldMap = {};
    for (const key of TRANSLATABLE_FIELDS) {
      const v = (place as any)[key];
      if (typeof v === "string" && v.trim()) toTranslate[key] = v;
    }

    const ai = new GoogleGenAI({ apiKey });
    const translatedScalars = await geminiTranslate(ai, toTranslate, target_locale);

    const translatedItems = await translateFromSpotItems(ai, place.from_spot_items ?? [], target_locale);

    const fields: Record<string, any> = { ...translatedScalars };
    if (Array.isArray(translatedItems) && translatedItems.length > 0) {
      fields.from_spot_items = translatedItems;
    }

    const { error: upsertErr } = await supabase
      .from("place_translations")
      .upsert(
        {
          place_id,
          locale: target_locale,
          fields,
          updated_at: new Date().toISOString(),
        },
        { onConflict: "place_id,locale" },
      );

    if (upsertErr) {
      console.error("upsert error:", upsertErr);
    }

    return new Response(JSON.stringify({ fields, cached: false }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error: any) {
    console.error("translate-place error:", error);
    return new Response(JSON.stringify({ error: error?.message ?? String(error) }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
