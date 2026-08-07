import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { CheckCircle2, CircleDashed, Lock } from "lucide-react";
import { AppShell } from "@/components/AppShell";
import { Skeleton } from "@/components/ui/skeleton";
import { Countdown } from "@/components/Countdown";
import { isLocked, predictionsQuery, racesQuery, resultsQuery, scoresQuery } from "@/lib/f1";

export const Route = createFileRoute("/_authenticated/races")({
  head: () => ({
    meta: [
      { title: "Races to Austin — F1 Family Predictor" },
      {
        name: "description",
        content:
          "Every remaining Grand Prix on the road to Austin: see which picks are in, which races are locked and what you scored.",
      },
      { property: "og:title", content: "Races to Austin — F1 Family Predictor" },
      {
        property: "og:description",
        content: "Your race-by-race pick tracker on the road to the US Grand Prix.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: RacesPage,
});

function RacesPage() {
  const { user } = Route.useRouteContext();
  const races = useQuery(racesQuery);
  const predictions = useQuery(predictionsQuery);
  const results = useQuery(resultsQuery);
  const scores = useQuery(scoresQuery);

  if (races.isLoading) {
    return (
      <AppShell>
        <Skeleton className="h-64 w-full rounded-3xl" />
      </AppShell>
    );
  }

  return (
    <AppShell>
      <h1 className="text-4xl">Road to Austin</h1>
      <p className="mt-1 text-sm text-muted-foreground">
        Make your picks before lights out. Points land as soon as the results are in.
      </p>

      <ul className="mt-6 space-y-3">
        {(races.data ?? []).map((race) => {
          const locked = isLocked(race);
          const myPick = (predictions.data ?? []).find(
            (pick) => pick.race_id === race.id && pick.user_id === user.id,
          );
          const scored = (scores.data ?? []).find(
            (score) => score.race_id === race.id && score.user_id === user.id,
          );
          const hasResult = (results.data ?? []).some((row) => row.race_id === race.id);

          return (
            <li key={race.id}>
              <Link
                to="/races/$raceId"
                params={{ raceId: race.id }}
                className="block rounded-2xl border border-border bg-card/70 p-4 transition-colors hover:border-primary/60"
              >
                <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
                  <span className="rounded-md bg-secondary px-2 py-0.5 text-xs text-muted-foreground">
                    R{race.round}
                  </span>
                  <span className="font-display text-2xl">{race.name}</span>
                  {race.is_final && (
                    <span className="rounded-md bg-accent px-2 py-0.5 text-xs font-semibold text-accent-foreground">
                      Finale
                    </span>
                  )}
                  <span className="ml-auto">
                    {scored ? (
                      <span className="tnum font-display text-2xl text-accent">+{scored.points}</span>
                    ) : locked ? (
                      <span className="inline-flex items-center gap-1 text-xs text-muted-foreground">
                        <Lock className="size-3.5" aria-hidden="true" />
                        {hasResult ? "Scored" : "Awaiting results"}
                      </span>
                    ) : myPick ? (
                      <span className="inline-flex items-center gap-1 text-xs text-success">
                        <CheckCircle2 className="size-3.5" aria-hidden="true" /> Picks in
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 text-xs text-primary">
                        <CircleDashed className="size-3.5" aria-hidden="true" /> Make your picks
                      </span>
                    )}
                  </span>
                </div>
                <div className="mt-1 flex flex-wrap items-center gap-x-3 text-sm text-muted-foreground">
                  <span>
                    {race.circuit} · {race.country}
                  </span>
                  {!locked && <Countdown target={race.race_start} compact />}
                </div>
              </Link>
            </li>
          );
        })}
      </ul>
    </AppShell>
  );
}
