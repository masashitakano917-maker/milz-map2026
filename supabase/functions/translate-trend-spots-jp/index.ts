import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { GoogleGenAI } from "npm:@google/genai@1.48.0";
import { createClient } from "npm:@supabase/supabase-js@2.101.1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

type SpotRow = {
  id: string;
  name: string;
  address: string | null;
  category: string | null;
  area_key: string;
  city_name: string | null;
  name_jp: string | null;
  address_jp: string | null;
  category_jp: string | null;
};

type Translation = {
  id: string;
  name_jp: string;
  address_jp: string;
  category_jp: string;
};

const BATCH_SIZE = 12;

function buildPrompt(rows: SpotRow[]): string {
  const items = rows.map((r) => ({
    id: r.id,
    area: r.area_key,
    city: r.city_name ?? "",
    name: r.name,
    address: r.address ?? "",
    category: r.category ?? "",
  }));
  return [
    "あなたは地名・店舗名・住所のローカライゼーション専門家です。",
    "以下のスポット情報(英語 / ローマ字 / 現地語混在)を、日本語話者にとって自然な日本語表記に変換してください。",
    "",
    "ルール:",
    "1. name_jp: 固有名詞の日本語表記。日本の著名な寺社・施設は漢字(例: Sensō-ji → 浅草寺, Tokyo Skytree → 東京スカイツリー, Kinkaku-ji → 金閣寺)。一般店舗名はそのまま、または自然なカタカナ。ブランド名は通例の日本語表記(例: Starbucks → スターバックス)。",
    "2. address_jp: 日本住所は『〒郵便番号 都道府県+市区町村+町名丁目番地 建物名階』のような自然な日本語形式。ローマ字の町名は可能な限り漢字に変換(例: Shimomatsuyachō → 下松屋町, Hiroo → 広尾, Jingūmae → 神宮前)。韓国住所は『ソウル特別市○○区○○洞 通り名 番地』。米国住所は『○○州○○市 番地 通り名』をカタカナで。末尾の国名(Japan / USA / South Korea)は省略可。",
    "3. category_jp: カテゴリーの自然な日本語(例: Art Museum → 美術館, Ramen Restaurant → ラーメン店, Coffee Shop → コーヒーショップ)。",
    "4. 元データが既に日本語なら整形のみ行い、意味は変えないこと。",
    "5. 出力は必ずJSON配列のみ。余計な説明・マークダウンは一切含めない。",
    "",
    "入力:",
    JSON.stringify(items, null, 2),
    "",
    "出力フォーマット (JSON配列):",
    '[{"id":"<uuid>","name_jp":"...","address_jp":"...","category_jp":"..."}, ...]',
  ].join("\n");
}

function extractJsonArray(text: string): unknown {
  const trimmed = text.trim().replace(/^```json\s*/i, "").replace(/^```\s*/i, "").replace(/```\s*$/i, "");
  const start = trimmed.indexOf("[");
  const end = trimmed.lastIndexOf("]");
  if (start === -1 || end === -1) throw new Error("No JSON array in model output");
  return JSON.parse(trimmed.slice(start, end + 1));
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 200, headers: corsHeaders });
  }

  try {
    const apiKey = Deno.env.get("GEMINI_API_KEY");
    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
    if (!apiKey || !supabaseUrl || !serviceKey) {
      return new Response(JSON.stringify({ error: "missing env" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const url = new URL(req.url);
    const areaFilter = url.searchParams.get("area");
    const limit = Number(url.searchParams.get("limit") ?? "200");
    const force = url.searchParams.get("force") === "1";

    const supabase = createClient(supabaseUrl, serviceKey);
    const ai = new GoogleGenAI({ apiKey });

    let query = supabase
      .from("ai_trend_spots")
      .select("id,name,address,category,area_key,city_name,name_jp,address_jp,category_jp")
      .limit(limit);
    if (areaFilter) query = query.eq("area_key", areaFilter);
    if (!force) {
      query = query.or("name_jp.is.null,address_jp.is.null,category_jp.is.null");
    }

    const { data, error } = await query;
    if (error) throw error;
    const rows = (data ?? []) as SpotRow[];

    if (rows.length === 0) {
      return new Response(JSON.stringify({ processed: 0, updated: 0 }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    let updated = 0;
    const errors: Array<{ batch: number; error: string }> = [];

    for (let i = 0; i < rows.length; i += BATCH_SIZE) {
      const batch = rows.slice(i, i + BATCH_SIZE);
      try {
        const prompt = buildPrompt(batch);
        const resp = await ai.models.generateContent({
          model: "gemini-2.5-flash",
          contents: prompt,
          config: { temperature: 0.2 },
        });
        const text = resp.text ?? "";
        const parsed = extractJsonArray(text) as Translation[];
        const byId = new Map(parsed.map((p) => [p.id, p]));
        for (const row of batch) {
          const t = byId.get(row.id);
          if (!t) continue;
          const patch: Partial<SpotRow> = {};
          if (t.name_jp) patch.name_jp = String(t.name_jp).slice(0, 500);
          if (t.address_jp) patch.address_jp = String(t.address_jp).slice(0, 800);
          if (t.category_jp) patch.category_jp = String(t.category_jp).slice(0, 200);
          if (Object.keys(patch).length === 0) continue;
          const { error: upErr } = await supabase
            .from("ai_trend_spots")
            .update(patch)
            .eq("id", row.id);
          if (upErr) {
            errors.push({ batch: i / BATCH_SIZE, error: upErr.message });
          } else {
            updated++;
          }
        }
      } catch (err) {
        errors.push({ batch: i / BATCH_SIZE, error: (err as Error).message });
      }
    }

    return new Response(
      JSON.stringify({ processed: rows.length, updated, errors }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error);
    return new Response(JSON.stringify({ error: msg }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
