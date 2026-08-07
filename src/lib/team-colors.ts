/**
 * Team accent colors live as CSS variables in src/styles.css so theming and the
 * high-contrast mode can override them. This helper just resolves the token.
 */
const TEAM_IDS = [
  "alpine",
  "aston_martin",
  "audi",
  "cadillac",
  "ferrari",
  "haas",
  "mclaren",
  "mercedes",
  "racing_bulls",
  "red_bull",
  "williams",
] as const;

export type TeamId = (typeof TEAM_IDS)[number];

export function teamColor(teamId: string | null | undefined): string {
  if (teamId && (TEAM_IDS as readonly string[]).includes(teamId)) {
    return `var(--team-${teamId.replace(/_/g, "-")})`;
  }
  return "var(--muted-foreground)";
}
