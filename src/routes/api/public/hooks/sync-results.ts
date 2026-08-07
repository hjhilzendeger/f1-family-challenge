import { createFileRoute } from "@tanstack/react-router";

/**
 * Called on a schedule to pull in official race results and award points.
 * Authenticated with the project's publishable key in the `apikey` header.
 */
export const Route = createFileRoute("/api/public/hooks/sync-results")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const apiKey = request.headers.get("apikey");
        const expected = process.env["SUPABASE_PUBLISHABLE_KEY"];
        if (!expected || apiKey !== expected) {
          return new Response(JSON.stringify({ error: "Unauthorized" }), {
            status: 401,
            headers: { "Content-Type": "application/json" },
          });
        }

        const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
        const { applyRaceResult, fetchOfficialResult } = await import("@/lib/results.server");

        const { data: races, error } = await supabaseAdmin
          .from("races")
          .select("id, season, round, name, race_start")
          .lte("race_start", new Date().toISOString())
          .order("round");
        if (error) {
          return new Response(JSON.stringify({ error: error.message }), {
            status: 500,
            headers: { "Content-Type": "application/json" },
          });
        }

        const { data: existing } = await supabaseAdmin.from("race_results").select("race_id");
        const done = new Set((existing ?? []).map((row) => row.race_id));
        const updated: string[] = [];

        for (const race of races ?? []) {
          if (done.has(race.id)) continue;
          const result = await fetchOfficialResult(race.season, race.round);
          if (!result || !result.p1_driver) continue;
          await applyRaceResult(race.id, result, "api");
          updated.push(race.id);
        }

        return Response.json({ ok: true, updated });
      },
    },
  },
});
