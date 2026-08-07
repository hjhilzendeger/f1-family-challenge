import { Link, useRouter } from "@tanstack/react-router";
import { Flag, Trophy, Users, LogOut, History } from "lucide-react";
import type { ReactNode } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";

const NAV = [
  { to: "/play", label: "Home", icon: Flag },
  { to: "/races", label: "Races", icon: Trophy },
  { to: "/history", label: "History", icon: History },
  { to: "/family", label: "Family", icon: Users },
] as const;

export function AppShell({ children }: { children: ReactNode }) {
  const router = useRouter();

  const signOut = async () => {
    await supabase.auth.signOut();
    await router.navigate({ to: "/" });
  };

  return (
    <div className="min-h-screen bg-background">
      <header className="sticky top-0 z-30 border-b border-border bg-background/85 backdrop-blur">
        <div className="mx-auto flex max-w-5xl items-center gap-2 px-4 py-3">
          <Link to="/play" className="mr-auto flex items-center gap-2">
            <span className="grid size-8 place-items-center rounded-lg gradient-speed font-display text-lg text-primary-foreground">
              F1
            </span>
            <span className="font-display text-xl tracking-wide">Family Predictor</span>
          </Link>
          <nav className="flex items-center gap-1">
            {NAV.map((item) => (
              <Link
                key={item.to}
                to={item.to}
                className="rounded-lg px-2 py-2 text-sm text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground data-[status=active]:bg-secondary data-[status=active]:text-foreground sm:px-3"
              >
                <item.icon className="size-4 sm:hidden" aria-hidden="true" />
                <span className="hidden sm:inline">{item.label}</span>
              </Link>
            ))}
            <Button variant="ghost" size="icon" onClick={signOut} aria-label="Sign out">
              <LogOut className="size-4" />
            </Button>
          </nav>
        </div>
      </header>
      <main className="mx-auto max-w-5xl px-4 py-6 pb-16">{children}</main>
    </div>
  );
}
