import { createFileRoute, Link, useRouter } from "@tanstack/react-router";
import { useState } from "react";
import { toast } from "sonner";
import { z } from "zod";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

const searchSchema = z.object({
  mode: z.enum(["signin", "signup"]).optional(),
});

export const Route = createFileRoute("/auth")({
  validateSearch: searchSchema,
  head: () => ({
    meta: [
      { title: "Join the family game — F1 Family Predictor" },
      {
        name: "description",
        content: "Sign in with a simple name and password to make your F1 race predictions with the family.",
      },
      { property: "og:title", content: "Join the family game — F1 Family Predictor" },
      {
        property: "og:description",
        content: "Simple sign-in for the family F1 prediction game. No fuss, just picks.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: AuthPage,
});

function AuthPage() {
  const search = Route.useSearch();
  const router = useRouter();
  const [mode, setMode] = useState<"signin" | "signup">(search.mode ?? "signup");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [busy, setBusy] = useState(false);

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    setBusy(true);
    try {
      if (mode === "signup") {
        const { data, error } = await supabase.auth.signUp({
          email,
          password,
          options: { emailRedirectTo: window.location.origin },
        });
        if (error) throw error;
        if (data.user) {
          await supabase.from("profiles").upsert({
            id: data.user.id,
            display_name: name.trim() || email.split("@")[0] || "Racer",
          });
        }
        toast.success(`Welcome aboard, ${name.trim() || "racer"}! 🏁`);
      } else {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
        toast.success("Back in the paddock! 🏎️");
      }
      await router.navigate({ to: "/play" });
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "That didn't work — try again?");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="grid min-h-screen place-items-center gradient-asphalt px-4 py-10">
      <div className="w-full max-w-sm rounded-3xl border border-border bg-card/85 p-6 shadow-card">
        <Link to="/" className="font-display text-sm uppercase tracking-widest text-muted-foreground">
          ← Back
        </Link>
        <h1 className="mt-4 text-4xl">{mode === "signup" ? "Join the game" : "Welcome back"}</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          {mode === "signup"
            ? "Pick a name your family will recognise on the leaderboard."
            : "Sign in and check where you sit."}
        </p>

        <form onSubmit={submit} className="mt-6 space-y-4">
          {mode === "signup" && (
            <div className="space-y-2">
              <Label htmlFor="name">Your name</Label>
              <Input
                id="name"
                value={name}
                onChange={(event) => setName(event.target.value)}
                placeholder="Dad, Ella, Uncle Joe…"
                autoComplete="nickname"
              />
            </div>
          )}
          <div className="space-y-2">
            <Label htmlFor="email">Email</Label>
            <Input
              id="email"
              type="email"
              required
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              autoComplete="email"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="password">Password</Label>
            <Input
              id="password"
              type="password"
              required
              minLength={6}
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              autoComplete={mode === "signup" ? "new-password" : "current-password"}
            />
          </div>
          <Button type="submit" className="w-full font-display text-lg tracking-wide" disabled={busy}>
            {busy ? "One moment…" : mode === "signup" ? "Start playing" : "Sign in"}
          </Button>
        </form>

        <button
          type="button"
          className="mt-4 w-full text-sm text-muted-foreground underline-offset-4 hover:underline"
          onClick={() => setMode(mode === "signup" ? "signin" : "signup")}
        >
          {mode === "signup" ? "Already have an account? Sign in" : "New here? Create an account"}
        </button>
      </div>
    </div>
  );
}
