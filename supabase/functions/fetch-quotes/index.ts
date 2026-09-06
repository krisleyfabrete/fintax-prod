// supabase/functions/fetch-quotes/index.ts
// Cache de cotações (BRAPI + CoinGecko).
import { getServiceClient } from "../_shared/admin.ts";
import { handleCors, json } from "../_shared/cors.ts";

interface Body { tickers: string[]; brapiKey?: string }

Deno.serve(async (req) => {
  const cors = handleCors(req); if (cors) return cors;
  try {
    const body: Body = await req.json();
    const supabase = getServiceClient();
    const result: Record<string, unknown> = {};

    // BRAPI para tickers brasileiros
    const brapiTickers = body.tickers.filter((t) => /^[A-Z]{4}\d{1,2}$/.test(t));
    if (brapiTickers.length > 0) {
      const url = `https://brapi.dev/api/quote/${brapiTickers.join(",")}?token=${body.brapiKey ?? ""}`;
      const r = await fetch(url);
      if (r.ok) {
        const data = await r.json();
        for (const q of data.results ?? []) {
          result[q.symbol] = q.regularMarketPrice;
          await supabase.from("quote_cache").upsert({
            ticker: q.symbol, price: q.regularMarketPrice, data: q, updated_at: new Date().toISOString(),
          }, { onConflict: "ticker" });
        }
      }
    }
    // CoinGecko para cripto
    const cryptoTickers = body.tickers.filter((t) => !/^[A-Z]{4}\d{1,2}$/.test(t));
    if (cryptoTickers.length > 0) {
      const ids = cryptoTickers.map((c) => c.toLowerCase()).join(",");
      const r = await fetch(`https://api.coingecko.com/api/v3/simple/price?ids=${ids}&vs_currencies=brl`);
      if (r.ok) {
        const data = await r.json();
        for (const [k, v] of Object.entries(data as Record<string, { brl: number }>)) {
          result[k.toUpperCase()] = v.brl;
        }
      }
    }
    return json(result);
  } catch (e) {
    return json({ error: (e as Error).message }, { status: 500 });
  }
});