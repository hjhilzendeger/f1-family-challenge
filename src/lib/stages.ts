import type { Prediction, Score } from "@/lib/f1";

export type Stage = 1 | 2 | 3 | 4;

export type StageInfo = {
  stage: Stage;
  title: string;
  blurb: string;
  fields: {
    podium: boolean;
    team: boolean;
    extras: boolean;
  };
  nextUnlock: string | null;
};

const STAGES: Record<Stage, Omit<StageInfo, "stage">> = {
  1: {
    title: "Rookie",
    blurb: "One question only: who wins the race?",
    fields: { podium: false, team: false, extras: false },
    nextUnlock: "Make your first winner pick to unlock the full podium.",
  },
  2: {
    title: "Podium Hunter",
    blurb: "Now call the whole podium — P1, P2 and P3.",
    fields: { podium: true, team: false, extras: false },
    nextUnlock: "Submit a full podium to unlock the winning team pick.",
  },
  3: {
    title: "Team Principal",
    blurb: "Podium plus the winning team.",
    fields: { podium: true, team: true, extras: false },
    nextUnlock: "Score points in one race to unlock pole and fastest lap.",
  },
  4: {
    title: "Race Strategist",
    blurb: "Everything: podium, team, pole position and fastest lap.",
    fields: { podium: true, team: true, extras: true },
    nextUnlock: null,
  },
};

export function computeStage(myPredictions: Prediction[], myScores: Score[]): StageInfo {
  let stage: Stage = 1;
  if (myPredictions.some((pick) => pick.p1_driver)) stage = 2;
  if (myPredictions.some((pick) => pick.p1_driver && pick.p2_driver && pick.p3_driver)) stage = 3;
  if (myScores.length > 0) stage = 4;
  return { stage, ...STAGES[stage] };
}

export function stageTitle(stage: Stage): string {
  return STAGES[stage].title;
}
