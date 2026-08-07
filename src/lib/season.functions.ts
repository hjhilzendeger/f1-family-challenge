import { createServerFn } from "@tanstack/react-start";
import { createClient } from "@supabase/supabase-js";
import type { Database } from "@/integrations/supabase/types";

export const getNextRacePreview = createServerFn({ method: "GET" }).handler(async () => {
  const key = process.env["SUPABASE_PUBLISHABLE_KEY"]!;
  const url = process.env["SUPABASE_URL"]!;
  const client = createClient<Database>(url, key, {
    auth: { persistSession: false, autoRefreshToken: false },
    global: {
      fetch: (input, init) => {
        const headers = new Headers(init?.headers);
        if (key.startsWith("sb_") && headers.get("Authorization") === `Bearer ${key}`) {
          headers.delete("Authorization");
        }
        headers.set("apikey", key);
        return fetch(input, { ...init, headers });
      },
    },
  });

  const { data } = await client
    .from("races")
    .select("id, name, circuit, country, race_start, round")
    .gt("race_start", new Date().toISOString())
    .order("race_start", { ascending: true })
    .limit(1);

  const { count } = await client.from("races").select("id", { count: "exact", head: true });

  return { race: data?.[0] ?? null, totalRaces: count ?? 0 };
});
