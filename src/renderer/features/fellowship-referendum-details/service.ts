import { type Track } from "@/domains/collectives";

interface RankActivityThreshold {
  activity: number | null;
  agreement: number | null;
}

const rankThresholds: Record<number, RankActivityThreshold> = {
  0: { activity: null, agreement: null },
  1: { activity: 90, agreement: null },
  2: { activity: 80, agreement: null },
  3: { activity: 70, agreement: 100 },
  4: { activity: 60, agreement: 90 },
  5: { activity: 50, agreement: 80 },
  6: { activity: 40, agreement: 70 },
  7: { activity: null, agreement: null },
  8: { activity: null, agreement: null },
  9: { activity: null, agreement: null },
};

function getActivityAndAgreementThresholds(rank: number) {
  return rankThresholds[rank] ?? { activity: null, agreement: null };
}

const getRankTitle = (rank: number, relatedTrack: Track[] | null | undefined) => {
  const name = relatedTrack?.find(t => t.id === rank)?.name;

  if (!name) return '';

  return name.charAt(0).toUpperCase() + name.slice(1);
};

export const detailsService = {
  getActivityAndAgreementThresholds,
  getRankTitle
};
