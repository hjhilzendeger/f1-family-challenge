export const POINTS = {
  exact: 10,
  podiumWrongSlot: 5,
  team: 8,
  pole: 6,
  fastestLap: 4,
  perfectPodium: 10,
} as const;

export const MAX_RACE_POINTS =
  POINTS.exact * 3 + POINTS.team + POINTS.pole + POINTS.fastestLap + POINTS.perfectPodium;

export type PickSet = {
  p1_driver: string | null;
  p2_driver: string | null;
  p3_driver: string | null;
  team_id: string | null;
  pole_driver: string | null;
  fastest_lap_driver: string | null;
};

export type BreakdownRow = {
  label: string;
  points: number;
  max: number;
  note: string;
};

export type ScoreResult = {
  points: number;
  exactPodiums: number;
  breakdown: BreakdownRow[];
};

const SLOTS = ["p1_driver", "p2_driver", "p3_driver"] as const;
const SLOT_LABELS = ["P1 pick", "P2 pick", "P3 pick"] as const;

export function scorePrediction(pick: PickSet | null, result: PickSet): ScoreResult {
  const breakdown: BreakdownRow[] = [];
  let points = 0;
  let exactPodiums = 0;

  const actualPodium = [result.p1_driver, result.p2_driver, result.p3_driver];

  SLOTS.forEach((slot, index) => {
    const label = SLOT_LABELS[index] ?? "Podium pick";
    const guess = pick?.[slot] ?? null;
    if (!guess) {
      breakdown.push({ label, points: 0, max: POINTS.exact, note: "No pick made" });
      return;
    }
    if (guess === actualPodium[index]) {
      points += POINTS.exact;
      exactPodiums += 1;
      breakdown.push({
        label,
        points: POINTS.exact,
        max: POINTS.exact,
        note: "Spot on!",
      });
      return;
    }
    if (actualPodium.includes(guess)) {
      points += POINTS.podiumWrongSlot;
      breakdown.push({
        label,
        points: POINTS.podiumWrongSlot,
        max: POINTS.exact,
        note: "On the podium, wrong step",
      });
      return;
    }
    breakdown.push({ label, points: 0, max: POINTS.exact, note: "Off the podium" });
  });

  const teamHit = Boolean(pick?.team_id) && pick?.team_id === result.team_id;
  if (teamHit) points += POINTS.team;
  breakdown.push({
    label: "Winning team",
    points: teamHit ? POINTS.team : 0,
    max: POINTS.team,
    note: pick?.team_id ? (teamHit ? "Nailed it" : "Not this time") : "No pick made",
  });

  const poleHit = Boolean(pick?.pole_driver) && pick?.pole_driver === result.pole_driver;
  if (poleHit) points += POINTS.pole;
  breakdown.push({
    label: "Pole position",
    points: poleHit ? POINTS.pole : 0,
    max: POINTS.pole,
    note: pick?.pole_driver ? (poleHit ? "Nailed it" : "Not this time") : "No pick made",
  });

  const flHit = Boolean(pick?.fastest_lap_driver) && pick?.fastest_lap_driver === result.fastest_lap_driver;
  if (flHit) points += POINTS.fastestLap;
  breakdown.push({
    label: "Fastest lap",
    points: flHit ? POINTS.fastestLap : 0,
    max: POINTS.fastestLap,
    note: pick?.fastest_lap_driver ? (flHit ? "Nailed it" : "Not this time") : "No pick made",
  });

  const perfect = exactPodiums === 3;
  if (perfect) points += POINTS.perfectPodium;
  breakdown.push({
    label: "Perfect podium bonus",
    points: perfect ? POINTS.perfectPodium : 0,
    max: POINTS.perfectPodium,
    note: perfect ? "The whole podium, in order!" : "Needs all three in order",
  });

  return { points, exactPodiums, breakdown };
}
