import { createFileRoute, Link, useRouter } from "@tanstack/react-router";
import { useState } from "react";
import { toast } from "sonner";
import { z } from "zod";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { normalizeUsername, usernameToEmail, validateUsername } from "@/lib/usernames";

const searchSchema = z.object({
  mode: z.enum(["signin", "signup"]).optional(),
});

export const Route = createFileRoute("/auth")({
  validateSearch: searchSchema,
  head: () => ({
    meta: [
      { title: "Join the family game — Friendly Family Competition" },
      {
        name: "description",
        content: "Sign in with just a name and password to make your F1 race predictions with the family.",
      },
      { property: "og:title", content: "Join the family game — Friendly Family Competition" },
      {
        property: "og:description",
        content: "Simple sign-in for the family F1 prediction game. No email, no fuss, just picks.",
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
  const [name, setName] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    setFormError(null);
    const problem = validateUsername(name);
    if (problem) {
      setFormError(problem);
      toast.error(problem);
      return;
    }
    const username = normalizeUsername(name);
    const email = usernameToEmail(name);
    setBusy(true);
    try {
      if (mode === "signup") {
        const { data, error } = await supabase.auth.signUp({ email, password });
        if (error) throw error;
        if (data.user) {
          await supabase.from("profiles").upsert({
            id: data.user.id,
            display_name: name.trim() || username,
            username,
          });
        }
        toast.success(`Welcome aboard, ${name.trim()}! 🏁`);
      } else {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) {
          throw new Error(
            error.message.toLowerCase().includes("credentials")
              ? "That password doesn't match — try again or ask an adult to help."
              : error.message,
          );
        }
        toast.success("Back in the paddock! 🏎️");
      }
      await router.navigate({ to: "/play" });
    } catch (error) {
      const message = error instanceof Error ? error.message : "That didn't work — try again?";
      setFormError(message);
      toast.error(message);
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
            ? "No email needed — just pick a name your family will recognise and a password you'll remember."
            : "Sign in with your name and password and check where you sit."}
        </p>

        <form onSubmit={submit} className="mt-6 space-y-4">
          <div className="space-y-2">
            <Label htmlFor="name">Your name</Label>
            <Input
              id="name"
              required
              value={name}
              onChange={(event) => setName(event.target.value)}
              placeholder="Dad, Ella, Uncle Joe…"
              autoComplete="username"
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
          {formError && (
            <p
              role="alert"
              aria-live="polite"
              className="animate-fade-in rounded-xl border border-destructive/50 bg-destructive/10 px-3 py-2 text-sm text-foreground"
            >
              ⚠️ {formError}
            </p>
          )}
          <Button type="submit" className="w-full font-display text-lg tracking-wide" disabled={busy}>
            {busy ? "One moment…" : mode === "signup" ? "Start playing" : "Sign in"}
          </Button>

        </form>

        <p className="mt-4 text-xs text-muted-foreground">
          Passwords are just to keep picks separate — if someone forgets theirs, an adult can make a new
          name for them.
        </p>

        <button
          type="button"
          className="mt-4 w-full text-sm text-muted-foreground underline-offset-4 hover:underline"
          onClick={() => setMode(mode === "signup" ? "signin" : "signup")}
        >
          {mode === "signup" ? "Already playing? Sign in" : "New here? Create a name"}
        </button>
      </div>
    </div>
  );
}

