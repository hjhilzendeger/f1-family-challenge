import { Link, useRouter, useRouterState } from "@tanstack/react-router";
import { Flag, Trophy, Users, LogOut, History, Type, Contrast } from "lucide-react";
import type { ReactNode } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { TooltipProvider } from "@/components/ui/tooltip";
import { useDisplaySettings } from "@/components/DisplaySettings";

const NAV = [
  { to: "/play", label: "Home", icon: Flag },
  { to: "/races", label: "Races", icon: Trophy },
  { to: "/history", label: "History", icon: History },
  { to: "/family", label: "Family", icon: Users },
] as const;

function NavSkeleton() {
  return (
    <div className="space-y-4" aria-busy="true" aria-label="Loading page">
      <Skeleton className="h-40 w-full rounded-3xl" />
      <Skeleton className="h-24 w-full rounded-3xl" />
      <div className="grid gap-4 md:grid-cols-2">
        <Skeleton className="h-40 w-full rounded-3xl" />
        <Skeleton className="h-40 w-full rounded-3xl" />
      </div>
    </div>
  );
}

export function AppShell({ children }: { children: ReactNode }) {
  const router = useRouter();
  const navigating = useRouterState({ select: (state) => state.status === "pending" });
  const { largeText, highContrast, toggleLargeText, toggleHighContrast } = useDisplaySettings();

  const signOut = async () => {
    await supabase.auth.signOut();
    await router.navigate({ to: "/" });
  };

  return (
    <TooltipProvider delayDuration={150}>
      <div className="min-h-screen bg-background">
        <header className="sticky top-0 z-30 border-b border-border bg-background/85 backdrop-blur">
          <div className="mx-auto flex max-w-5xl items-center gap-2 px-4 py-3">
            <Link to="/play" className="mr-auto flex items-center gap-2">
              <span className="grid size-8 place-items-center rounded-lg gradient-speed font-display text-lg text-primary-foreground">
                F1
              </span>
              <span className="font-display text-xl tracking-wide">Friendly Family Competition</span>
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
              <Button
                variant="ghost"
                size="icon"
                onClick={toggleLargeText}
                aria-pressed={largeText}
                aria-label={largeText ? "Use normal text size" : "Use large text"}
                title={largeText ? "Normal text size" : "Large text"}
              >
                <Type className="size-4" />
              </Button>
              <Button
                variant="ghost"
                size="icon"
                onClick={toggleHighContrast}
                aria-pressed={highContrast}
                aria-label={highContrast ? "Turn off high contrast" : "Turn on high contrast"}
                title="High contrast"
              >
                <Contrast className="size-4" />
              </Button>
              <Button variant="ghost" size="icon" onClick={signOut} aria-label="Sign out">
                <LogOut className="size-4" />
              </Button>
            </nav>
          </div>
          <div className="h-0.5 w-full overflow-hidden">
            {navigating && <div className="h-full w-full gradient-speed animate-pulse" />}
          </div>
        </header>
        <main className="mx-auto max-w-5xl px-4 py-6 pb-16">
          {navigating ? <NavSkeleton /> : children}
        </main>
      </div>
    </TooltipProvider>
  );
}
