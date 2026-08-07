import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useMemo, useState } from "react";
import { toast } from "sonner";
import { ArrowLeft, Lock, PartyPopper } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { AppShell } from "@/components/AppShell";
import { Countdown } from "@/components/Countdown";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import {
  driverName,
  driversQuery,
  isLocked,
  predictionsQuery,
  profilesQuery,
  racesQuery,
  resultsQuery,
  scoresQuery,
  teamName,
  teamsQuery,
  type Driver,
  type Team,
} from "@/lib/f1";
import { MAX_RACE_POINTS, type BreakdownRow } from "@/lib/scoring";
import { computeStage } from "@/lib/stages";
import { saveRaceResult } from "@/lib/results.functions";

export const Route = createFileRoute("/_authenticated/races/$raceId")({
  head: () => ({
    meta: [
      { title: "Make your picks — F1 Family Predictor" },
      {
        name: "description",
        content:
          "Choose your podium, winning team, pole position and fastest lap for this Grand Prix, then see how the family scored.",
      },
      { property: "og:title", content: "Make your picks — F1 Family Predictor" },
      {
        property: "og:description",
        content: "Podium, team, pole and fastest lap picks for this Grand Prix.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: RaceDetail,
});

type FieldKey = "p1_driver" | "p2_driver" | "p3_driver" | "pole_driver" | "fastest_lap_driver";

function DriverField({
  id,
  label,
  drivers,
  value,
  onChange,
}: {
  id: string;
  label: string;
  drivers: Driver[];
  value: string | null;
  onChange: (value: string) => void;
}) {
  return (
    <div className="space-y-2">
      <Label htmlFor={id}>{label}</Label>
      <Select value={value ?? ""} onValueChange={onChange}>
        <SelectTrigger id={id}>
          <SelectValue placeholder="Pick a driver" />
        </SelectTrigger>
        <SelectContent>
          {drivers.map((driver) => (
            <SelectItem key={driver.id} value={driver.id}>
              {driver.full_name}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}

function RaceDetail() {
  const { raceId } = Route.useParams();
  const { user } = Route.useRouteContext();
  const queryClient = useQueryClient();

  const races = useQuery(racesQuery);
  const drivers = useQuery(driversQuery);
  const teams = useQuery(teamsQuery);
  const predictions = useQuery(predictionsQuery);
  const results = useQuery(resultsQuery);
  const scores = useQuery(scoresQuery);
  const profiles = useQuery(profilesQuery);

  const race = (races.data ?? []).find((row) => row.id === raceId) ?? null;
  const myPick = (predictions.data ?? []).find(
    (pick) => pick.race_id === raceId && pick.user_id === user.id,
  );
  const myScores = (scores.data ?? []).filter((score) => score.user_id === user.id);
  const myPredictions = (predictions.data ?? []).filter((pick) => pick.user_id === user.id);
  const stage = computeStage(myPredictions, myScores);
  const result = (results.data ?? []).find((row) => row.race_id === raceId) ?? null;

  const [draft, setDraft] = useState<Record<FieldKey | "team_id", string | null>>({
    p1_driver: null,
    p2_driver: null,
    p3_driver: null,
    team_id: null,
    pole_driver: null,
    fastest_lap_driver: null,
  });
  const [touched, setTouched] = useState(false);

  const current = useMemo(() => {
    if (touched) return draft;
    return {
      p1_driver: myPick?.p1_driver ?? null,
      p2_driver: myPick?.p2_driver ?? null,
      p3_driver: myPick?.p3_driver ?? null,
      team_id: myPick?.team_id ?? null,
      pole_driver: myPick?.pole_driver ?? null,
      fastest_lap_driver: myPick?.fastest_lap_driver ?? null,
    };
  }, [touched, draft, myPick]);

  const set = (key: FieldKey | "team_id", value: string) => {
    setDraft({ ...current, [key]: value });
    setTouched(true);
  };

  if (races.isLoading || !race) {
    return (
      <AppShell>
        {races.isLoading ? (
          <Skeleton className="h-64 w-full rounded-3xl" />
        ) : (
          <p className="text-muted-foreground">We couldn't find that race.</p>
        )}
      </AppShell>
    );
  }

  const locked = isLocked(race);
  const driverList = drivers.data ?? [];
  const teamList: Team[] = teams.data ?? [];

  const savePicks = async () => {
    const { error } = await supabase.from("predictions").upsert(
      { user_id: user.id, race_id: race.id, ...current },
      { onConflict: "user_id,race_id" },
    );
    if (error) {
      toast.error(error.message);
      return;
    }
    const me = (profiles.data ?? []).find((profile) => profile.id === user.id);
    await supabase.from("activity").insert({
      user_id: user.id,
      group_id: me?.group_id ?? null,
      message: `${me?.display_name ?? "Someone"} locked in picks for ${race.name} 🔒`,
    });
    toast.success("Picks saved — good luck! 🍀");
    setTouched(false);
    await queryClient.invalidateQueries();
  };

  return (
    <AppShell>
      <Link
        to="/races"
        className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="size-4" aria-hidden="true" /> All races
      </Link>

      <div className="mt-3 rounded-3xl border border-border bg-card/85 p-5 shadow-card">
        <h1 className="text-4xl">{race.name}</h1>
        <p className="text-sm text-muted-foreground">
          Round {race.round} · {race.circuit} · {race.country}
        </p>
        <div className="mt-4">
          {locked ? (
            <p className="inline-flex items-center gap-2 text-sm text-muted-foreground">
              <Lock className="size-4" aria-hidden="true" /> Picks are locked for this race.
            </p>
          ) : (
            <Countdown target={race.race_start} />
          )}
        </div>
      </div>

      {!locked && (
        <section className="mt-6 rounded-3xl border border-border bg-card/70 p-5">
          <h2 className="text-2xl">Your picks</h2>
          <p className="text-sm text-muted-foreground">
            Level {stage.stage} · {stage.blurb}
          </p>

          <div className="mt-5 grid gap-4 sm:grid-cols-2">
            <DriverField
              id="p1"
              label="🥇 Race winner"
              drivers={driverList}
              value={current.p1_driver}
              onChange={(value) => set("p1_driver", value)}
            />
            {stage.fields.podium && (
              <>
                <DriverField
                  id="p2"
                  label="🥈 Second place"
                  drivers={driverList}
                  value={current.p2_driver}
                  onChange={(value) => set("p2_driver", value)}
                />
                <DriverField
                  id="p3"
                  label="🥉 Third place"
                  drivers={driverList}
                  value={current.p3_driver}
                  onChange={(value) => set("p3_driver", value)}
                />
              </>
            )}
            {stage.fields.team && (
              <div className="space-y-2">
                <Label htmlFor="team">🏎️ Winning team</Label>
                <Select
                  value={current.team_id ?? ""}
                  onValueChange={(value) => set("team_id", value)}
                >
                  <SelectTrigger id="team">
                    <SelectValue placeholder="Pick a team" />
                  </SelectTrigger>
                  <SelectContent>
                    {teamList.map((team) => (
                      <SelectItem key={team.id} value={team.id}>
                        {team.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}
            {stage.fields.extras && (
              <>
                <DriverField
                  id="pole"
                  label="⏱️ Pole position"
                  drivers={driverList}
                  value={current.pole_driver}
                  onChange={(value) => set("pole_driver", value)}
                />
                <DriverField
                  id="fl"
                  label="⚡ Fastest lap"
                  drivers={driverList}
                  value={current.fastest_lap_driver}
                  onChange={(value) => set("fastest_lap_driver", value)}
                />
              </>
            )}
          </div>

          {stage.nextUnlock && (
            <p className="mt-4 text-sm text-muted-foreground">🔓 {stage.nextUnlock}</p>
          )}

          <Button className="mt-5 font-display text-lg tracking-wide" onClick={savePicks}>
            Save my picks
          </Button>
        </section>
      )}

      {locked && (
        <ResultsSection
          raceId={race.id}
          raceName={race.name}
          drivers={driverList}
          teams={teamList}
          result={result}
        />
      )}

      {locked && (
        <FamilyPicks
          raceId={race.id}
          drivers={driverList}
          teams={teamList}
          predictions={predictions.data ?? []}
          profiles={profiles.data ?? []}
          scores={scores.data ?? []}
        />
      )}
    </AppShell>
  );
}

function ResultsSection({
  raceId,
  raceName,
  drivers,
  teams,
  result,
}: {
  raceId: string;
  raceName: string;
  drivers: Driver[];
  teams: Team[];
  result: {
    p1_driver: string | null;
    p2_driver: string | null;
    p3_driver: string | null;
    team_id: string | null;
    pole_driver: string | null;
    fastest_lap_driver: string | null;
  } | null;
}) {
  const queryClient = useQueryClient();
  const save = useServerFn(saveRaceResult);
  const [entry, setEntry] = useState<Record<string, string | null>>({});
  const [busy, setBusy] = useState(false);

  if (result) {
    return (
      <section className="mt-6 rounded-3xl border border-border bg-card/70 p-5">
        <h2 className="text-2xl">How it finished</h2>
        <ul className="mt-3 grid gap-2 sm:grid-cols-2">
          {[
            ["🥇 Winner", driverName(drivers, result.p1_driver)],
            ["🥈 Second", driverName(drivers, result.p2_driver)],
            ["🥉 Third", driverName(drivers, result.p3_driver)],
            ["🏎️ Winning team", teamName(teams, result.team_id)],
            ["⏱️ Pole", driverName(drivers, result.pole_driver)],
            ["⚡ Fastest lap", driverName(drivers, result.fastest_lap_driver)],
          ].map(([label, value]) => (
            <li key={label} className="flex justify-between rounded-xl bg-secondary/40 px-3 py-2 text-sm">
              <span className="text-muted-foreground">{label}</span>
              <span className="font-semibold">{value}</span>
            </li>
          ))}
        </ul>
      </section>
    );
  }

  const submit = async () => {
    setBusy(true);
    try {
      await save({
        data: {
          raceId,
          p1_driver: entry["p1_driver"] ?? null,
          p2_driver: entry["p2_driver"] ?? null,
          p3_driver: entry["p3_driver"] ?? null,
          team_id: entry["team_id"] ?? null,
          pole_driver: entry["pole_driver"] ?? null,
          fastest_lap_driver: entry["fastest_lap_driver"] ?? null,
        },
      });
      toast.success(`Results in for ${raceName} — points awarded! 🎉`);
      await queryClient.invalidateQueries();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Couldn't save those results.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <section className="mt-6 rounded-3xl border border-border bg-card/70 p-5">
      <h2 className="text-2xl">Results not in yet</h2>
      <p className="text-sm text-muted-foreground">
        They usually arrive automatically after the race. Anyone in the family can fill them in to award
        points now.
      </p>
      <div className="mt-4 grid gap-4 sm:grid-cols-2">
        {[
          ["p1_driver", "🥇 Winner"],
          ["p2_driver", "🥈 Second"],
          ["p3_driver", "🥉 Third"],
          ["pole_driver", "⏱️ Pole"],
          ["fastest_lap_driver", "⚡ Fastest lap"],
        ].map(([key, label]) => (
          <DriverField
            key={key}
            id={`result-${key}`}
            label={label as string}
            drivers={drivers}
            value={entry[key as string] ?? null}
            onChange={(value) => setEntry((prev) => ({ ...prev, [key as string]: value }))}
          />
        ))}
        <div className="space-y-2">
          <Label htmlFor="result-team">🏎️ Winning team</Label>
          <Select
            value={entry["team_id"] ?? ""}
            onValueChange={(value) => setEntry((prev) => ({ ...prev, team_id: value }))}
          >
            <SelectTrigger id="result-team">
              <SelectValue placeholder="Pick a team" />
            </SelectTrigger>
            <SelectContent>
              {teams.map((team) => (
                <SelectItem key={team.id} value={team.id}>
                  {team.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>
      <Button className="mt-5" onClick={submit} disabled={busy}>
        {busy ? "Scoring…" : "Post results & award points"}
      </Button>
    </section>
  );
}

function FamilyPicks({
  raceId,
  drivers,
  teams,
  predictions,
  profiles,
  scores,
}: {
  raceId: string;
  drivers: Driver[];
  teams: Team[];
  predictions: Array<{
    id: string;
    user_id: string;
    race_id: string;
    p1_driver: string | null;
    p2_driver: string | null;
    p3_driver: string | null;
    team_id: string | null;
    pole_driver: string | null;
    fastest_lap_driver: string | null;
  }>;
  profiles: Array<{ id: string; display_name: string; nickname: string | null }>;
  scores: Array<{ user_id: string; race_id: string; points: number; breakdown: unknown }>;
}) {
  const rows = predictions.filter((pick) => pick.race_id === raceId);
  if (rows.length === 0) return null;

  return (
    <section className="mt-6 rounded-3xl border border-border bg-card/70 p-5">
      <div className="flex items-center gap-2">
        <PartyPopper className="size-4 text-accent" aria-hidden="true" />
        <h2 className="text-2xl">Everyone's picks</h2>
      </div>
      <div className="mt-4 space-y-3">
        {rows.map((pick) => {
          const profile = profiles.find((row) => row.id === pick.user_id);
          const score = scores.find((row) => row.user_id === pick.user_id && row.race_id === raceId);
          const breakdown = Array.isArray(score?.breakdown)
            ? (score?.breakdown as BreakdownRow[])
            : [];
          return (
            <div key={pick.id} className="rounded-2xl border border-border bg-secondary/30 p-4">
              <div className="flex items-baseline gap-2">
                <span className="font-display text-2xl">
                  {profile?.nickname || profile?.display_name || "Mystery racer"}
                </span>
                {score && (
                  <span className="ml-auto tnum font-display text-2xl text-accent">
                    {score.points}
                    <span className="text-sm text-muted-foreground">/{MAX_RACE_POINTS}</span>
                  </span>
                )}
              </div>
              <p className="mt-1 text-sm text-muted-foreground">
                {driverName(drivers, pick.p1_driver)} · {driverName(drivers, pick.p2_driver)} ·{" "}
                {driverName(drivers, pick.p3_driver)} · {teamName(teams, pick.team_id)}
              </p>
              {breakdown.length > 0 && (
                <ul className="mt-3 grid gap-1 sm:grid-cols-2">
                  {breakdown.map((row) => (
                    <li key={row.label} className="flex items-center justify-between text-xs">
                      <span className="text-muted-foreground">
                        {row.label} — {row.note}
                      </span>
                      <span className={row.points > 0 ? "text-success" : "text-muted-foreground"}>
                        +{row.points}
                      </span>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          );
        })}
      </div>
    </section>
  );
}
