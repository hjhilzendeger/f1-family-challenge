import { createFileRoute, Link } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { toast } from "sonner";
import { Trophy, Sparkles, Lock, ChevronRight } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Countdown } from "@/components/Countdown";
import { AppShell } from "@/components/AppShell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";
import { Skeleton } from "@/components/ui/skeleton";
import {
  activityQuery,
  driversQuery,
  groupsQuery,
  nextRace,
  predictionsQuery,
  profilesQuery,
  racesQuery,
  scoresQuery,
} from "@/lib/f1";
import { computeStage } from "@/lib/stages";

export const Route = createFileRoute("/_authenticated/play")({
  head: () => ({
    meta: [
      { title: "Your race home — F1 Family Predictor" },
      {
        name: "description",
        content:
          "Countdown to the next Grand Prix, make your winner pick in one tap and see how the family leaderboard is shaping up.",
      },
      { property: "og:title", content: "Your race home — F1 Family Predictor" },
      {
        property: "og:description",
        content: "Next race countdown, one-tap picks and the family leaderboard.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: PlayPage,
});

const MEDALS = ["🥇", "🥈", "🥉"];

function PlayPage() {
  const { user } = Route.useRouteContext();
  const queryClient = useQueryClient();

  const profiles = useQuery(profilesQuery);
  const races = useQuery(racesQuery);
  const drivers = useQuery(driversQuery);
  const predictions = useQuery(predictionsQuery);
  const scores = useQuery(scoresQuery);
  const groups = useQuery(groupsQuery);
  const activity = useQuery(activityQuery);

  const me = profiles.data?.find((profile) => profile.id === user.id) ?? null;

  if (profiles.isLoading || races.isLoading) {
    return (
      <AppShell>
        <Skeleton className="h-40 w-full rounded-3xl" />
      </AppShell>
    );
  }

  if (!me) {
    return (
      <AppShell>
        <Onboarding userId={user.id} groups={groups.data ?? []} />
      </AppShell>
    );
  }

  const upcoming = nextRace(races.data ?? []);
  const myPredictions = (predictions.data ?? []).filter((pick) => pick.user_id === user.id);
  const myScores = (scores.data ?? []).filter((score) => score.user_id === user.id);
  const stage = computeStage(myPredictions, myScores);
  const myPick = upcoming ? myPredictions.find((pick) => pick.race_id === upcoming.id) : undefined;

  const family = (profiles.data ?? []).filter(
    (profile) => me.group_id && profile.group_id === me.group_id,
  );
  const standings = family
    .map((profile) => {
      const total = (scores.data ?? [])
        .filter((score) => score.user_id === profile.id)
        .reduce((sum, score) => sum + score.points, 0);
      return { profile, total };
    })
    .sort((a, b) => b.total - a.total);

  const groupActivity = (activity.data ?? []).filter(
    (row) => !me.group_id || row.group_id === me.group_id,
  );

  const quickPick = async (driverId: string) => {
    if (!upcoming) return;
    const { error } = await supabase.from("predictions").upsert(
      { user_id: user.id, race_id: upcoming.id, p1_driver: driverId },
      { onConflict: "user_id,race_id" },
    );
    if (error) {
      toast.error(error.message);
      return;
    }
    const driver = drivers.data?.find((row) => row.id === driverId);
    await supabase.from("activity").insert({
      user_id: user.id,
      group_id: me.group_id,
      message: `${me.display_name} is backing ${driver?.full_name ?? "a driver"} to win ${upcoming.name} 🏎️`,
    });
    toast.success(`Locked in: ${driver?.full_name ?? "your pick"} for the win! 🎉`);
    await queryClient.invalidateQueries();
  };

  const stagePercent = (stage.stage / 4) * 100;

  return (
    <AppShell>
      <div className="space-y-6">
        <section className="track-stripes rounded-3xl border border-border bg-card/85 p-5 shadow-card sm:p-7">
          <p className="text-xs uppercase tracking-widest text-muted-foreground">
            Hey {me.nickname || me.display_name} — next up
          </p>
          {upcoming ? (
            <>
              <h1 className="mt-2 text-4xl sm:text-5xl">{upcoming.name}</h1>
              <p className="text-sm text-muted-foreground">
                Round {upcoming.round} · {upcoming.circuit}
              </p>
              <div className="mt-5">
                <Countdown target={upcoming.race_start} />
              </div>

              <div className="mt-6">
                <h2 className="text-2xl">Who wins?</h2>
                <p className="text-sm text-muted-foreground">
                  {myPick?.p1_driver
                    ? "Tap another driver any time before the race starts."
                    : "One tap, that's it. You can add more picks later."}
                </p>
                <div className="mt-3 flex flex-wrap gap-2">
                  {(drivers.data ?? []).map((driver) => {
                    const selected = myPick?.p1_driver === driver.id;
                    return (
                      <button
                        key={driver.id}
                        type="button"
                        onClick={() => quickPick(driver.id)}
                        className={`rounded-xl border px-3 py-2 text-sm font-semibold transition-all ${
                          selected
                            ? "border-primary bg-primary text-primary-foreground shadow-glow"
                            : "border-border bg-secondary/50 text-foreground hover:border-primary/60 hover:bg-secondary"
                        }`}
                      >
                        {driver.code}
                      </button>
                    );
                  })}
                </div>
                {myPick?.p1_driver && (
                  <Button asChild variant="secondary" className="mt-4">
                    <Link to="/races/$raceId" params={{ raceId: upcoming.id }}>
                      Add my other picks <ChevronRight className="size-4" />
                    </Link>
                  </Button>
                )}
              </div>
            </>
          ) : (
            <>
              <h1 className="mt-2 text-4xl">Season complete 🏁</h1>
              <p className="mt-2 text-muted-foreground">
                Austin was the finale. Check the final family standings below!
              </p>
            </>
          )}
        </section>

        <section className="rounded-3xl border border-border bg-card/70 p-5">
          <div className="flex items-center gap-2">
            <Sparkles className="size-4 text-accent" aria-hidden="true" />
            <h2 className="text-2xl">
              Level {stage.stage}: {stage.title}
            </h2>
          </div>
          <p className="mt-1 text-sm text-muted-foreground">{stage.blurb}</p>
          <Progress value={stagePercent} className="mt-4" />
          <p className="mt-3 flex items-center gap-2 text-sm text-muted-foreground">
            {stage.nextUnlock ? (
              <>
                <Lock className="size-3.5" aria-hidden="true" /> {stage.nextUnlock}
              </>
            ) : (
              <>🏆 All picks unlocked — you're a full-blown strategist.</>
            )}
          </p>
        </section>

        <div className="grid gap-6 md:grid-cols-2">
          <section className="rounded-3xl border border-border bg-card/70 p-5">
            <div className="flex items-center gap-2">
              <Trophy className="size-4 text-accent" aria-hidden="true" />
              <h2 className="text-2xl">Family leaderboard</h2>
            </div>
            {standings.length === 0 ? (
              <p className="mt-3 text-sm text-muted-foreground">
                Join a family group to see everyone's points.{" "}
                <Link to="/family" className="text-primary underline-offset-4 hover:underline">
                  Pick your family
                </Link>
              </p>
            ) : (
              <ol className="mt-3 space-y-2">
                {standings.map((row, index) => (
                  <li
                    key={row.profile.id}
                    className={`flex items-center gap-3 rounded-xl border px-3 py-2 ${
                      row.profile.id === user.id
                        ? "border-primary/60 bg-primary/10"
                        : "border-border bg-secondary/40"
                    }`}
                  >
                    <span className="w-6 text-center">{MEDALS[index] ?? index + 1}</span>
                    <span className="flex-1 truncate font-semibold">
                      {row.profile.nickname || row.profile.display_name}
                    </span>
                    <span className="tnum font-display text-2xl">{row.total}</span>
                  </li>
                ))}
              </ol>
            )}
          </section>

          <section className="rounded-3xl border border-border bg-card/70 p-5">
            <h2 className="text-2xl">Family chatter</h2>
            {groupActivity.length === 0 ? (
              <p className="mt-3 text-sm text-muted-foreground">
                Nothing yet — be the first to make a pick!
              </p>
            ) : (
              <ul className="mt-3 space-y-2 text-sm">
                {groupActivity.slice(0, 8).map((row) => (
                  <li key={row.id} className="rounded-xl bg-secondary/40 px-3 py-2 text-muted-foreground">
                    {row.message}
                  </li>
                ))}
              </ul>
            )}
          </section>
        </div>
      </div>
    </AppShell>
  );
}

function Onboarding({
  userId,
  groups,
}: {
  userId: string;
  groups: Array<{ id: string; name: string }>;
}) {
  const queryClient = useQueryClient();
  const [name, setName] = useState("");
  const [newGroup, setNewGroup] = useState("");

  const join = useMutation({
    mutationFn: async (groupId: string | null) => {
      let finalGroupId = groupId;
      if (!finalGroupId && newGroup.trim()) {
        const { data, error } = await supabase
          .from("family_groups")
          .insert({ name: newGroup.trim(), created_by: userId })
          .select("id")
          .single();
        if (error) throw new Error(error.message);
        finalGroupId = data.id;
      }
      const { error } = await supabase.from("profiles").upsert({
        id: userId,
        display_name: name.trim() || "Racer",
        group_id: finalGroupId,
      });
      if (error) throw new Error(error.message);
    },
    onSuccess: async () => {
      toast.success("You're in! Let's make some picks 🏁");
      await queryClient.invalidateQueries();
    },
    onError: (error: Error) => toast.error(error.message),
  });

  return (
    <div className="mx-auto max-w-lg rounded-3xl border border-border bg-card/85 p-6 shadow-card">
      <h1 className="text-4xl">Welcome to the family game</h1>
      <p className="mt-2 text-sm text-muted-foreground">
        Two quick things and you're racing.
      </p>
      <div className="mt-6 space-y-4">
        <div className="space-y-2">
          <Label htmlFor="displayName">What should the family call you?</Label>
          <Input
            id="displayName"
            value={name}
            onChange={(event) => setName(event.target.value)}
            placeholder="Dad, Ella, Uncle Joe…"
          />
        </div>

        {groups.length > 0 && (
          <div className="space-y-2">
            <Label>Join a family group</Label>
            <div className="flex flex-wrap gap-2">
              {groups.map((group) => (
                <Button
                  key={group.id}
                  variant="secondary"
                  disabled={join.isPending}
                  onClick={() => join.mutate(group.id)}
                >
                  {group.name}
                </Button>
              ))}
            </div>
          </div>
        )}

        <div className="space-y-2">
          <Label htmlFor="newGroup">…or start a new one</Label>
          <div className="flex gap-2">
            <Input
              id="newGroup"
              value={newGroup}
              onChange={(event) => setNewGroup(event.target.value)}
              placeholder="The Hilzendegers"
            />
            <Button
              disabled={join.isPending || !newGroup.trim()}
              onClick={() => join.mutate(null)}
            >
              Create
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
