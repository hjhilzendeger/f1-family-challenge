import { scorePrediction, type PickSet } from "@/lib/scoring";

export type DemoRace = {
  id: string;
  round: number;
  name: string;
  country: string;
  result: PickSet;
};

export type DemoPlayer = {
  id: string;
  name: string;
  emoji: string;
};

/** Simulated family crew — replaced by real nicknames when the family has profiles. */
export const DEMO_PLAYERS: DemoPlayer[] = [
  { id: "p1", name: "Dad", emoji: "🏎️" },
  { id: "p2", name: "Mom", emoji: "⚡" },
  { id: "p3", name: "Jake", emoji: "🔧" },
  { id: "p4", name: "Ella", emoji: "🌟" },
  { id: "p5", name: "Grandpa", emoji: "🕰️" },
];

const R = (
  id: string,
  round: number,
  name: string,
  country: string,
  p1: string,
  p2: string,
  p3: string,
  team: string,
  pole: string,
  fl: string,
): DemoRace => ({
  id,
  round,
  name,
  country,
  result: {
    p1_driver: p1,
    p2_driver: p2,
    p3_driver: p3,
    team_id: team,
    pole_driver: pole,
    fastest_lap_driver: fl,
  },
});

export const DEMO_RACES: DemoRace[] = [
  R("h_bahrain", 8, "Bahrain Grand Prix", "Bahrain", "norris", "verstappen", "piastri", "mclaren", "norris", "leclerc"),
  R("h_miami", 9, "Miami Grand Prix", "USA", "verstappen", "piastri", "russell", "red_bull", "piastri", "hamilton"),
  R("h_monaco", 10, "Monaco Grand Prix", "Monaco", "leclerc", "norris", "verstappen", "ferrari", "leclerc", "norris"),
  R("h_canada", 11, "Canadian Grand Prix", "Canada", "russell", "antonelli", "norris", "mercedes", "russell", "verstappen"),
  R("h_austria", 12, "Austrian Grand Prix", "Austria", "piastri", "norris", "leclerc", "mclaren", "norris", "piastri"),
  R("h_britain", 13, "British Grand Prix", "UK", "hamilton", "norris", "verstappen", "ferrari", "verstappen", "russell"),
  R("h_hungary", 14, "Hungarian Grand Prix", "Hungary", "norris", "leclerc", "piastri", "mclaren", "leclerc", "alonso"),
];

/** Deterministic simulated picks: playerIndex + round drives a fixed pattern. */
const POOL = [
  "norris",
  "verstappen",
  "piastri",
  "leclerc",
  "russell",
  "hamilton",
  "antonelli",
  "sainz",
  "alonso",
  "hadjar",
];
const TEAM_POOL = ["mclaren", "red_bull", "ferrari", "mercedes", "williams"];

function pick(seed: number, offset: number): string {
  return POOL[(seed * 3 + offset * 7) % POOL.length] as string;
}

export function simulatedPick(playerIndex: number, race: DemoRace): PickSet {
  const seed = playerIndex * 5 + race.round;
  const accurate = (playerIndex + race.round) % 3 === 0;
  const half = (playerIndex + race.round) % 4 === 1;

  if (accurate) {
    return {
      ...race.result,
      fastest_lap_driver: half ? pick(seed, 4) : race.result.fastest_lap_driver,
    };
  }

  if (half) {
    return {
      p1_driver: race.result.p2_driver,
      p2_driver: race.result.p1_driver,
      p3_driver: pick(seed, 1),
      team_id: race.result.team_id,
      pole_driver: pick(seed, 2),
      fastest_lap_driver: race.result.fastest_lap_driver,
    };
  }

  return {
    p1_driver: pick(seed, 0),
    p2_driver: pick(seed, 1) === pick(seed, 0) ? pick(seed, 5) : pick(seed, 1),
    p3_driver: race.result.p3_driver,
    team_id: TEAM_POOL[seed % TEAM_POOL.length] as string,
    pole_driver: pick(seed, 3),
    fastest_lap_driver: pick(seed, 4),
  };
}

export type RaceRoundResult = {
  race: DemoRace;
  rows: Array<{
    playerId: string;
    points: number;
    exactPodiums: number;
    best: string;
  }>;
};

/** Points every player earned in every demo race, in round order. */
export function buildHistory(players: DemoPlayer[]): RaceRoundResult[] {
  return DEMO_RACES.map((race) => ({
    race,
    rows: players.map((player, index) => {
      const scored = scorePrediction(simulatedPick(index, race), race.result);
      const best = [...scored.breakdown].sort((a, b) => b.points - a.points)[0];
      return {
        playerId: player.id,
        points: scored.points,
        exactPodiums: scored.exactPodiums,
        best: best && best.points > 0 ? best.label : "Tough weekend",
      };
    }),
  }));
}
