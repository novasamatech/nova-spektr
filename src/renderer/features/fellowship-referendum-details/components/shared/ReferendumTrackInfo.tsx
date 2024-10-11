import { useGate, useStoreMap } from 'effector-react';
import { memo } from 'react';

import { Box } from '@/shared/ui-kit';
import { type TrackId } from '@shared/pallet/referenda';
import { FootnoteText, Icon } from '@shared/ui';
import { type IconNames } from '@shared/ui/Icon/data';
import { referendumsDetailsFeatureStatus } from '../../model/status';
import { tracksModel } from '../../model/tracks';

function getTrackInfo(trackId: TrackId) {
  const names: Record<TrackId, { icon: IconNames }> = {
    1: { icon: 'rfcVoting' },
    2: { icon: 'whitelistVoting' },
    3: { icon: 'whitelistVoting' },
    4: { icon: 'rfcVoting' },
    5: { icon: 'rfcVoting' },
    6: { icon: 'rfcVoting' },
    7: { icon: 'rfcVoting' },
    8: { icon: 'rfcVoting' },
    9: { icon: 'rfcVoting' },
    11: { icon: 'retainVoting' },
    12: { icon: 'retainVoting' },
    13: { icon: 'retainVoting' },
    14: { icon: 'retainVoting' },
    15: { icon: 'retainVoting' },
    16: { icon: 'retainVoting' },
    21: { icon: 'promoteVoting' },
    22: { icon: 'promoteVoting' },
    23: { icon: 'promoteVoting' },
    24: { icon: 'promoteVoting' },
    25: { icon: 'promoteVoting' },
    26: { icon: 'promoteVoting' },
  };

  return names[trackId] || { icon: 'voting' };
}

type Props = {
  track: TrackId;
};

export const ReferendumTrackInfo = memo<Props>(({ track }) => {
  useGate(referendumsDetailsFeatureStatus.gate);

  const trackInfo = useStoreMap({
    store: tracksModel.$list,
    keys: [track],
    fn: (list, [track]) => list.find(x => x.id === track) ?? null,
  });

  if (!trackInfo) {
    return null;
  }

  const { icon } = getTrackInfo(trackInfo.id);

  return (
    <Box direction="row" gap={1}>
      <Icon name={icon} size={16} className="text-text-secondary" />
      <FootnoteText className="text-text-secondary">{trackInfo.name}</FootnoteText>
    </Box>
  );
});
