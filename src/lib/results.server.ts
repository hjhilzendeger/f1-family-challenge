import { supabaseAdmin } from "@/integrations/supabase/client.server";
import { scorePrediction, type PickSet } from "@/lib/scoring";

export type ResultInput = PickSet;

/**
 * Stores the official finishing order for a race and (re)calculates everyone's points.
 */
export async function applyRaceResult(raceId: string, result: ResultInput, source: string) {
  const { error: resultError } = await supabaseAdmin
    .from("race_results")
    .upsert({ race_id: raceId, ...result, source }, { onConflict: "race_id" });
  if (resultError) throw new Error(resultError.message);

  const { data: predictions, error: predictionError } = await supabaseAdmin
    .from("predictions")
    .select("*")
    .eq("race_id", raceId);
  if (predictionError) throw new Error(predictionError.message);

  const rows = (predictions ?? []).map((pick) => {
    const scored = scorePrediction(pick, result);
    return {
      user_id: pick.user_id,
      race_id: raceId,
      points: scored.points,
      exact_podiums: scored.exactPodiums,
      breakdown: scored.breakdown,
    };
  });

  if (rows.length > 0) {
    const { error: scoreError } = await supabaseAdmin
      .from("scores")
      .upsert(rows, { onConflict: "user_id,race_id" });
    if (scoreError) throw new Error(scoreError.message);
  }

  return { scored: rows.length };
}

const CODE_TO_ID: Record<string, string> = {
  NOR: "norris",
  PIA: "piastri",
  LEC: "leclerc",
  HAM: "hamilton",
  VER: "verstappen",
  HAD: "hadjar",
  RUS: "russell",
  ANT: "antonelli",
  ALO: "alonso",
  STR: "stroll",
  GAS: "gasly",
  COL: "colapinto",
  ALB: "albon",
  SAI: "sainz",
  LAW: "lawson",
  LIN: "lindblad",
  OCO: "ocon",
  BEA: "bearman",
  HUL: "hulkenberg",
  BOR: "bortoleto",
  PER: "perez",
  BOT: "bottas",
};

type ErgastDriver = { driverId?: string; code?: string };
type ErgastResult = {
  position?: string;
  Driver?: ErgastDriver;
  Constructor?: { constructorId?: string };
  FastestLap?: { rank?: string };
  grid?: string;
};

async function knownDriverIds(): Promise<Set<string>> {
  const { data } = await supabaseAdmin.from("drivers").select("id");
  return new Set((data ?? []).map((row) => row.id));
}

async function knownTeamIds(): Promise<Set<string>> {
  const { data } = await supabaseAdmin.from("teams").select("id");
  return new Set((data ?? []).map((row) => row.id));
}

function mapDriver(driver: ErgastDriver | undefined, known: Set<string>): string | null {
  if (!driver) return null;
  if (driver.driverId && known.has(driver.driverId)) return driver.driverId;
  const byCode = driver.code ? CODE_TO_ID[driver.code] : undefined;
  return byCode && known.has(byCode) ? byCode : null;
}

/**
 * Best-effort lookup of official results from the public Jolpica/Ergast F1 API.
 * Returns null when the race isn't published yet, so the manual entry can take over.
 */
export async function fetchOfficialResult(
  season: number,
  round: number,
): Promise<ResultInput | null> {
  const response = await fetch(`https://api.jolpi.ca/ergast/f1/${season}/${round}/results.json`);
  if (!response.ok) return null;
  const payload = (await response.json()) as {
    MRData?: { RaceTable?: { Races?: Array<{ Results?: ErgastResult[] }> } };
  };
  const results = payload.MRData?.RaceTable?.Races?.[0]?.Results;
  if (!results || results.length < 3) return null;

  const drivers = await knownDriverIds();
  const teams = await knownTeamIds();

  const podium = [results[0], results[1], results[2]];
  const pole = results.find((row) => row.grid === "1");
  const fastest = results.find((row) => row.FastestLap?.rank === "1");
  const winnerTeam = results[0]?.Constructor?.constructorId ?? null;

  return {
    p1_driver: mapDriver(podium[0]?.Driver, drivers),
    p2_driver: mapDriver(podium[1]?.Driver, drivers),
    p3_driver: mapDriver(podium[2]?.Driver, drivers),
    team_id: winnerTeam && teams.has(winnerTeam) ? winnerTeam : null,
    pole_driver: mapDriver(pole?.Driver, drivers),
    fastest_lap_driver: mapDriver(fastest?.Driver, drivers),
  };
}
