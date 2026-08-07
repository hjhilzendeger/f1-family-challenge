// Young family members don't have email addresses, so sign-in uses a name only.
// We derive a stable, hidden address from the name for the auth system.
export const USERNAME_EMAIL_DOMAIN = "family.local";

export function normalizeUsername(raw: string) {
  return raw
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9._-]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 32);
}

export function usernameToEmail(raw: string) {
  return `${normalizeUsername(raw)}@${USERNAME_EMAIL_DOMAIN}`;
}

export function validateUsername(raw: string) {
  const normalized = normalizeUsername(raw);
  if (normalized.length < 2) return "Pick a name with at least 2 letters or numbers.";
  return null;
}
