import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useEffect, useMemo, useState } from "react";
import { Pause, Play, RotateCcw, Trophy } from "lucide-react";
import { AppShell } from "@/components/AppShell";
import { Button } from "@/components/ui/button";
import { profilesQuery } from "@/lib/f1";
import { MAX_RACE_POINTS } from "@/lib/scoring";
import { buildHistory, DEMO_PLAYERS, type DemoPlayer } from "@/lib/history-demo";

export const Route = createFileRoute("/_authenticated/history")({
  head: () => ({
    meta: [
      { title: "Prediction History — F1 Family Predictor" },
      {
        name: "description",
        content:
          "Replay the family championship race by race: simulated picks, points scored and the leaderboard shuffling in real time.",
      },
      { property: "og:title", content: "Prediction History — F1 Family Predictor" },
      {
        property: "og:description",
        content: "Watch the family leaderboard shuffle race by race in an animated replay.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: HistoryPage,
});

const EMOJIS = ["🏎️", "⚡", "🔧", "🌟", "🕰️"];
const ROW = 72;

function HistoryPage() {
  const { user } = Route.useRouteContext();
  const profiles = useQuery(profilesQuery);

  const players: DemoPlayer[] = useMemo(() => {
    const me = (profiles.data ?? []).find((profile) => profile.id === user.id);
    if (!me) return DEMO_PLAYERS;
    return [
      { id: me.id, name: `${me.nickname || me.display_name} (you)`, emoji: "🏎️" },
      ...DEMO_PLAYERS.slice(0, 4),
    ];
  }, [profiles.data, user.id]);

  const history = useMemo(() => buildHistory(players), [players]);

  const [step, setStep] = useState(0);
  const [playing, setPlaying] = useState(true);

  useEffect(() => {
    setStep(0);
    setPlaying(true);
  }, [history]);

  useEffect(() => {
    if (!playing) return;
    if (step >= history.length) {
      setPlaying(false);
      return;
    }
    const id = setTimeout(() => setStep((value) => value + 1), 1800);
    return () => clearTimeout(id);
  }, [playing, step, history.length]);

  const standings = useMemo(() => {
    const totals = new Map(players.map((player) => [player.id, 0]));
    const wins = new Map(players.map((player) => [player.id, 0]));
    history.slice(0, step).forEach((round) => {
      const best = Math.max(...round.rows.map((row) => row.points));
      round.rows.forEach((row) => {
        totals.set(row.playerId, (totals.get(row.playerId) ?? 0) + row.points);
        if (row.points === best && best > 0) wins.set(row.playerId, (wins.get(row.playerId) ?? 0) + 1);
      });
    });
    return players
      .map((player) => ({
        player,
        total: totals.get(player.id) ?? 0,
        wins: wins.get(player.id) ?? 0,
      }))
      .sort((a, b) => b.total - a.total || a.player.name.localeCompare(b.player.name));
  }, [history, players, step]);

  const current = step > 0 ? history[step - 1] : null;
  const leaderTotal = standings[0]?.total ?? 0;
  const finished = step >= history.length;

  return (
    <AppShell>
      <h1 className="text-4xl">Prediction History</h1>
      <p className="mt-1 text-sm text-muted-foreground">
        A replay of the family championship so far — simulated picks scored against past race results. Hit play and
        watch the leaderboard shuffle.
      </p>

      <div className="mt-6 flex flex-wrap items-center gap-2">
        <Button onClick={() => (finished ? (setStep(0), setPlaying(true)) : setPlaying(!playing))}>
          {finished ? (
            <>
              <RotateCcw className="size-4" /> Replay
            </>
          ) : playing ? (
            <>
              <Pause className="size-4" /> Pause
            </>
          ) : (
            <>
              <Play className="size-4" /> Play
            </>
          )}
        </Button>
        <Button
          variant="secondary"
          onClick={() => {
            setPlaying(false);
            setStep((value) => Math.min(history.length, value + 1));
          }}
          disabled={finished}
        >
          Next race
        </Button>
        <span className="text-sm text-muted-foreground">
          Race {Math.min(step, history.length)} of {history.length}
        </span>
      </div>

      <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-secondary">
        <div
          className="h-full gradient-speed transition-all duration-700"
          style={{ width: `${(step / history.length) * 100}%` }}
        />
      </div>

      <div className="mt-6 rounded-3xl border border-border bg-card/70 p-4 sm:p-6">
        <div className="flex items-baseline justify-between gap-3">
          <div>
            <div className="text-xs uppercase tracking-widest text-muted-foreground">
              {current ? `Round ${current.race.round} • ${current.race.country}` : "Ready to roll"}
            </div>
            <div className="font-display text-3xl">{current ? current.race.name : "Press play"}</div>
          </div>
          {current && (
            <span className="rounded-md bg-secondary px-2 py-1 text-xs text-muted-foreground">
              Max {MAX_RACE_POINTS} pts
            </span>
          )}
        </div>

        <div className="relative mt-5" style={{ height: standings.length * ROW }}>
          {standings.map((entry, position) => {
            const share = leaderTotal > 0 ? (entry.total / leaderTotal) * 100 : 0;
            const gained = current?.rows.find((row) => row.playerId === entry.player.id);
            return (
              <div
                key={entry.player.id}
                className="absolute inset-x-0 transition-transform duration-700 ease-out"
                style={{ transform: `translateY(${position * ROW}px)` }}
              >
                <div className="flex items-center gap-3 rounded-2xl border border-border bg-secondary/40 px-3 py-2">
                  <span className="w-6 text-center font-display text-xl text-muted-foreground">{position + 1}</span>
                  <span className="text-xl" aria-hidden="true">
                    {entry.player.emoji}
                  </span>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <span className="truncate font-semibold">{entry.player.name}</span>
                      {position === 0 && entry.total > 0 && (
                        <Trophy className="size-4 text-accent" aria-hidden="true" />
                      )}
                      {gained && gained.points > 0 && (
                        <span
                          key={`${entry.player.id}-${step}`}
                          className="animate-fade-in rounded-md bg-primary/20 px-1.5 py-0.5 text-[11px] font-semibold text-primary"
                        >
                          +{gained.points}
                        </span>
                      )}
                    </div>
                    <div className="mt-1 h-1.5 overflow-hidden rounded-full bg-background">
                      <div
                        className="h-full gradient-speed transition-all duration-700"
                        style={{ width: `${share}%` }}
                      />
                    </div>
                    {gained && (
                      <div className="mt-1 truncate text-[11px] text-muted-foreground">{gained.best}</div>
                    )}
                  </div>
                  <div className="text-right">
                    <div className="tnum font-display text-2xl leading-none">{entry.total}</div>
                    <div className="text-[10px] uppercase tracking-widest text-muted-foreground">
                      {entry.wins} wins
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {finished && standings[0] && (
        <div className="mt-4 animate-scale-in rounded-2xl border border-accent/40 bg-accent/10 p-4 text-center">
          <div className="font-display text-2xl">
            {standings[0].player.emoji} {standings[0].player.name} leads the family with {standings[0].total} points!
          </div>
          <p className="mt-1 text-sm text-muted-foreground">
            These are practice rounds — real points start with your picks for the next Grand Prix.
          </p>
        </div>
      )}
    </AppShell>
  );
}
