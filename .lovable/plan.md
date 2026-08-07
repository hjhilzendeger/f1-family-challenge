# F1 Family Prediction Game

A standalone prediction game app your family can use alongside the existing F1 Race Companion site. You'll be able to link to it from there.

## What it does

Family members sign in, join a family group, and predict each upcoming race up to the US Grand Prix in Austin. After a race finishes, results are pulled in automatically and points are awarded based on accuracy. A leaderboard ranks everyone.

## Sign in and family groups

- Simple email + password sign-in only (no Google or other social sign-in), with email confirmation turned off so kids can sign up and start playing immediately.
- Each member has a display name and avatar-style initial.
- A family group is created by the first member, who gets an invite code. Others enter that code when signing up to join the group.
- Leaderboards and predictions are scoped to the group, so only family members see each other's picks.
- One member is the group admin (whoever created it) and can rename the group, regenerate the invite code, and remove members.

## Making predictions

For each race, a member predicts:

- P1, P2, P3 drivers (in order)
- Winning constructor/team
- Pole position driver
- Fastest lap driver

Predictions lock at the scheduled race start time. Before lock, picks are editable; after lock, everyone's picks become visible to the group.

## Scoring (accuracy-based)

| Pick | Points |
| --- | --- |
| Driver in exactly the right podium position | 10 |
| Driver on the podium but wrong position | 5 |
| Winning team correct | 8 |
| Pole position correct | 6 |
| Fastest lap correct | 4 |
| Bonus: entire podium exactly right | 10 |

Max 48 points per race. Season standings are the sum of all race scores, with ties broken by number of exact podiums.

## Race results

Results are fetched automatically from a public F1 results API (Jolpica/Ergast-style) shortly after each race. Scores are then calculated and the leaderboard updates. If the feed is late or incomplete for a race, the group admin sees a manual-entry fallback form so the round can still be scored.

## Screens

- **Home / Leaderboard** — season standings for your family group, next race countdown, your prediction status.
- **Race list** — remaining races through the US GP in Austin, each showing locked/open status and your score.
- **Race detail** — prediction form before lock; everyone's picks plus results and points breakdown after.
- **Group** — members, invite code, admin controls.
- **Auth** — sign in / sign up with invite code.

## Design

Motorsport-styled dark UI: asphalt-dark surfaces, a single hot accent for actions and leaders, tabular numerals for points, condensed uppercase headings. Podium picks use a drag-free three-slot selector so it works well on phones.

## Tone: family game, not a tournament

Keep it light and playful. Friendly copy and gentle teasing rather than official-sounding language, fun nicknames next to names, emoji-style reactions on the leaderboard, and everyone visible on the standings (no "eliminated" or harsh callouts). Sign-in stays simple — join with an invite code, no verification hoops, no admin consoles or audit-style screens. Scoring is explained in plain language, and results are framed as bragging rights.


## Engagement principles

**1. Hook in the first minute.** After sign-in, the very first screen is a live countdown to the next race with a single prominent "Make your pick" call to action — no empty dashboard. The prediction flow starts with just one question ("Who wins?") which can be answered in a few seconds, and immediately shows a confirmation with what the pick is worth. The countdown, race name, and circuit art give instant context.

**2. Progression without overwhelm.** Picks are staged, and later stages only unlock once the earlier one is made:

```text
Stage 1  Race winner                     (always available)
Stage 2  Full podium P1-P2-P3            (after first winner pick)
Stage 3  Winning team                    (after first podium submitted)
Stage 4  Pole position + fastest lap     (after first race is scored)
```

A short "level" indicator on the home screen shows which stage the member has reached and what unlocks next. Members who ignore the extras still compete — they just score from fewer categories. A three-step first-run tour explains predicting, locking, and scoring, and nothing else.

**3. Continuous feedback.** Every action confirms itself and every result explains itself:

- Instant toast and saved-state badge when a pick is stored, plus a "picks complete" progress ring per race.
- Live lock countdown that changes tone as the deadline nears.
- After scoring, an animated points breakdown per pick showing exactly what earned or missed points, with your rank change (up/down/same) versus last race.
- Streak and personal-best callouts, plus a small "you beat 3 of 5 family members this race" line.
- A group activity feed ("Dad locked his picks for Austin") so the app feels alive between races.

## Technical notes

- Lovable Cloud provides auth, database, and server logic.
- Tables: `family_groups`, `group_members` (with role), `races`, `drivers`, `teams`, `predictions`, `race_results`, `scores`. Row-level security scopes reads/writes to the signed-in user's group; predictions are readable by the group only after lock.
- Race calendar, drivers and teams are seeded in a migration so the app has data on first load.
- A scheduled/public server route fetches finished-race results, then a scoring routine writes per-member points; scoring is idempotent so re-runs don't double-count.
- Prediction writes are validated server-side against the race lock time, so lock cannot be bypassed from the browser.
