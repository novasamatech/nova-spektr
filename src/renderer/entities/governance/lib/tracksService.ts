import { type TFunction } from 'i18next';

import { type Asset } from '@/shared/core';
import { nonNullable } from '@/shared/lib/utils';
import { treasurySpendsDescription } from '../constants/tracks';
import { type Track } from '../types/tracks';

export const getTreasuryTrackDescription = (asset: Asset | null, description: string, t: TFunction) => {
  if (nonNullable(asset) && treasurySpendsDescription[description]?.[asset.symbol]) {
    return t(description, { value: treasurySpendsDescription[description][asset.symbol], asset: asset.symbol });
  }

  return t(`${description}General`);
};

export const getGovernanceTrackDescription = (asset: Asset | null, description: string, t: TFunction) => {
  if (nonNullable(asset) && treasurySpendsDescription[description]?.[asset.symbol]) {
    return t(description, { value: treasurySpendsDescription[description][asset.symbol], asset: asset.symbol });
  }

  return t(description);
};

export const getTrackIds = (tracks: Track[], votedTracks: string[]): number[] => {
  return tracks.filter((t) => !votedTracks.includes(t.id)).map((track) => Number(track.id));
};

export const getGroupPallet = (
  trackGroup: Track[],
  votedTracks: string[],
  tracksIds: number[],
): 'primary' | 'secondary' => {
  const tracksGroupId = getTrackIds(trackGroup, votedTracks);

  return tracksGroupId.length !== 0 && tracksGroupId.every((t) => tracksIds.includes(t)) ? 'primary' : 'secondary';
};

export const getTrackTitles = (trackIds: string[], allTracks: Track[], t: TFunction): string => {
  const titles = allTracks.reduce<string[]>((titles, { id, value }) => {
    if (trackIds.includes(id)) {
      titles.push(t(value));
    }

    return titles;
  }, []);

  return titles.join(', ');
};
