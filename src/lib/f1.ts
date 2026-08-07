import { queryOptions } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import type { Tables } from "@/integrations/supabase/types";

export type Team = Tables<"teams">;
export type Driver = Tables<"drivers">;
export type Race = Tables<"races">;
export type Prediction = Tables<"predictions">;
export type RaceResult = Tables<"race_results">;
export type Score = Tables<"scores">;
export type Profile = Tables<"profiles">;
export type FamilyGroup = Tables<"family_groups">;
export type ActivityRow = Tables<"activity">;

function unwrap<T>(res: { data: T | null; error: { message: string } | null }): T {
  if (res.error) throw new Error(res.error.message);
  return (res.data ?? []) as T;
}

export const teamsQuery = queryOptions({
  queryKey: ["teams"],
  queryFn: async () => unwrap<Team[]>(await supabase.from("teams").select("*").order("name")),
  staleTime: 5 * 60_000,
});

export const driversQuery = queryOptions({
  queryKey: ["drivers"],
  queryFn: async () =>
    unwrap<Driver[]>(await supabase.from("drivers").select("*").eq("active", true).order("full_name")),
  staleTime: 5 * 60_000,
});

export const racesQuery = queryOptions({
  queryKey: ["races"],
  queryFn: async () => unwrap<Race[]>(await supabase.from("races").select("*").order("round")),
  staleTime: 60_000,
});

export const resultsQuery = queryOptions({
  queryKey: ["race_results"],
  queryFn: async () => unwrap<RaceResult[]>(await supabase.from("race_results").select("*")),
});

export const scoresQuery = queryOptions({
  queryKey: ["scores"],
  queryFn: async () => unwrap<Score[]>(await supabase.from("scores").select("*")),
});

export const profilesQuery = queryOptions({
  queryKey: ["profiles"],
  queryFn: async () => unwrap<Profile[]>(await supabase.from("profiles").select("*")),
});

export const groupsQuery = queryOptions({
  queryKey: ["family_groups"],
  queryFn: async () =>
    unwrap<FamilyGroup[]>(await supabase.from("family_groups").select("*").order("created_at")),
});

export const activityQuery = queryOptions({
  queryKey: ["activity"],
  queryFn: async () =>
    unwrap<ActivityRow[]>(
      await supabase.from("activity").select("*").order("created_at", { ascending: false }).limit(20),
    ),
});

export const predictionsQuery = queryOptions({
  queryKey: ["predictions"],
  queryFn: async () => unwrap<Prediction[]>(await supabase.from("predictions").select("*")),
});

export function nextRace(races: Race[], now = Date.now()): Race | null {
  const upcoming = races
    .filter((race) => new Date(race.race_start).getTime() > now)
    .sort((a, b) => new Date(a.race_start).getTime() - new Date(b.race_start).getTime());
  return upcoming[0] ?? null;
}

export function isLocked(race: Race, now = Date.now()): boolean {
  return new Date(race.race_start).getTime() <= now;
}

export function driverName(drivers: Driver[], id: string | null): string {
  if (!id) return "—";
  return drivers.find((driver) => driver.id === id)?.full_name ?? "—";
}

export function driverCode(drivers: Driver[], id: string | null): string {
  if (!id) return "—";
  return drivers.find((driver) => driver.id === id)?.code ?? "—";
}

export function teamName(teams: Team[], id: string | null): string {
  if (!id) return "—";
  return teams.find((team) => team.id === id)?.name ?? "—";
}
