import Rank1Icon from '@/shared/assets/images/ranks/rank1.svg?jsx';
import Rank2Icon from '@/shared/assets/images/ranks/rank2.svg?jsx';
import Rank3Icon from '@/shared/assets/images/ranks/rank3.svg?jsx';
import Rank4Icon from '@/shared/assets/images/ranks/rank4.svg?jsx';
import Rank5Icon from '@/shared/assets/images/ranks/rank5.svg?jsx';
import Rank6Icon from '@/shared/assets/images/ranks/rank6.svg?jsx';
import Rank7Icon from '@/shared/assets/images/ranks/rank7.svg?jsx';
import Rank8Icon from '@/shared/assets/images/ranks/rank8.svg?jsx';
import Rank9Icon from '@/shared/assets/images/ranks/rank9.svg?jsx';
import { type RankData, getAllRanks } from '../data';
import { PROGRESS_WITH_DIVIDERS_WIDTHS } from '../model/constants';

export const getRankIcon = (rankId: number) => {
  switch (rankId) {
    case 1:
      return Rank1Icon;
    case 2:
      return Rank2Icon;
    case 3:
      return Rank3Icon;
    case 4:
      return Rank4Icon;
    case 5:
      return Rank5Icon;
    case 6:
      return Rank6Icon;
    case 7:
      return Rank7Icon;
    case 8:
      return Rank8Icon;
    case 9:
      return Rank9Icon;
    default:
      return null;
  }
};

export const getRankWidthFellowshipSlot = (rank: number): number => {
  if (rank === 1) return 16;
  if (rank === 2) return 20;
  if (rank >= 3 && rank <= 5) return 28;
  if (rank >= 6 && rank <= 7) return 32;
  return 44;
};

export const createRankSegmentFellowshipSlot = (rank: RankData) => ({
  id: `rank-${rank.rank}`,
  label: rank.label,
  width: getRankWidthFellowshipSlot(rank.rank),
  color: rank.color,
  filled: 0,
});

export const createRankSegmentsRankTab = () => {
  return getAllRanks().map(rank => ({
    id: rank.rank.toString(),
    title: rank.name,
    topLabel: rank.time,
    color: rank.color,
    width: PROGRESS_WITH_DIVIDERS_WIDTHS[rank.rank],
  }));
};
