import { createFileRoute, Link } from "@tanstack/react-router";
import { Flag, Trophy, Users, Sparkles } from "lucide-react";
import { getNextRacePreview } from "@/lib/season.functions";
import { Countdown } from "@/components/Countdown";
import { Button } from "@/components/ui/button";

export const Route = createFileRoute("/")({
  loader: () => getNextRacePreview(),
  head: () => ({
    meta: [
      { title: "F1 Family Predictor — Race Picks & Family Leaderboard" },
      {
        name: "description",
        content:
          "A friendly family game: predict the F1 podium, winning team, pole and fastest lap each race on the road to Austin, and climb the family leaderboard.",
      },
      { property: "og:title", content: "F1 Family Predictor — Race Picks & Family Leaderboard" },
      {
        property: "og:description",
        content:
          "Predict each Grand Prix with your family, earn points for accuracy and race to the top before the US Grand Prix in Austin.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Landing,
  errorComponent: () => (
    <div className="grid min-h-screen place-items-center p-6 text-center text-muted-foreground">
      Something went sideways loading the season. Try refreshing.
    </div>
  ),
  notFoundComponent: () => <div className="p-6">Not found</div>,
});

function Landing() {
  const { race, totalRaces } = Route.useLoaderData();

  return (
    <div className="min-h-screen gradient-asphalt">
      <div className="mx-auto max-w-3xl px-4 py-14">
        <div className="track-stripes rounded-3xl border border-border bg-card/80 p-6 shadow-card sm:p-10">
          <span className="inline-flex items-center gap-2 rounded-full bg-secondary px-3 py-1 text-xs uppercase tracking-widest text-muted-foreground">
            <Sparkles className="size-3.5" aria-hidden="true" /> Family game night, F1 edition
          </span>
          <h1 className="mt-5 text-5xl leading-none sm:text-7xl">
            Who wins the
            <span className="block gradient-speed bg-clip-text text-transparent">next Grand Prix?</span>
          </h1>
          <p className="mt-4 max-w-xl text-muted-foreground">
            Make your picks, tease your siblings, and see who really knows their racing. Points for every
            accurate call, all the way to the US Grand Prix in Austin.
          </p>

          {race ? (
            <div className="mt-8 rounded-2xl border border-border bg-secondary/40 p-5">
              <div className="flex flex-wrap items-baseline gap-x-3">
                <span className="font-display text-2xl">{race.name}</span>
                <span className="text-sm text-muted-foreground">
                  {race.circuit} · {race.country}
                </span>
              </div>
              <div className="mt-4">
                <Countdown target={race.race_start} />
              </div>
            </div>
          ) : (
            <p className="mt-8 text-muted-foreground">The season is done — check the final standings!</p>
          )}

          <div className="mt-8 flex flex-wrap gap-3">
            <Button asChild size="lg" className="font-display text-lg tracking-wide shadow-glow">
              <Link to="/auth">Make my first pick</Link>
            </Button>
            <Button asChild size="lg" variant="secondary">
              <Link to="/auth" search={{ mode: "signin" }}>
                I already play
              </Link>
            </Button>
          </div>
        </div>

        <div className="mt-6 grid gap-4 sm:grid-cols-3">
          {[
            { icon: Flag, title: "One tap to start", body: "Round one is a single question: pick the winner." },
            { icon: Trophy, title: "Unlock as you go", body: "Podium, team, pole and fastest lap open up over time." },
            {
              icon: Users,
              title: `${totalRaces} races to Austin`,
              body: "Join a family group and battle for the crown.",
            },
          ].map((item) => (
            <div key={item.title} className="rounded-2xl border border-border bg-card/70 p-4">
              <item.icon className="size-5 text-primary" aria-hidden="true" />
              <h2 className="mt-3 text-xl">{item.title}</h2>
              <p className="mt-1 text-sm text-muted-foreground">{item.body}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
