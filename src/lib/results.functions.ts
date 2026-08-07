import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

const pickSchema = z.object({
  raceId: z.string().min(1),
  p1_driver: z.string().min(1).nullable(),
  p2_driver: z.string().min(1).nullable(),
  p3_driver: z.string().min(1).nullable(),
  team_id: z.string().min(1).nullable(),
  pole_driver: z.string().min(1).nullable(),
  fastest_lap_driver: z.string().min(1).nullable(),
});

/**
 * A family member fills in the official result for a race that has already run,
 * and everyone's points are recalculated.
 */
export const saveRaceResult = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => pickSchema.parse(input))
  .handler(async ({ data, context }) => {
    const { raceId, ...result } = data;
    const { applyRaceResult } = await import("@/lib/results.server");
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    const { data: race } = await supabaseAdmin
      .from("races")
      .select("race_start, name")
      .eq("id", raceId)
      .maybeSingle();
    if (!race) throw new Error("That race doesn't exist.");
    if (new Date(race.race_start).getTime() > Date.now()) {
      throw new Error("That race hasn't happened yet!");
    }

    const outcome = await applyRaceResult(raceId, result, "manual");

    const { data: profile } = await supabaseAdmin
      .from("profiles")
      .select("display_name, group_id")
      .eq("id", context.userId)
      .maybeSingle();

    await supabaseAdmin.from("activity").insert({
      user_id: context.userId,
      group_id: profile?.group_id ?? null,
      message: `${profile?.display_name ?? "Someone"} posted the results for ${race.name} — points are in! 🏁`,
    });

    return outcome;
  });
