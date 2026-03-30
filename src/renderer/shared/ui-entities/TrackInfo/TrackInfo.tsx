import { memo } from 'react';

import { type TrackId } from '@/shared/core';
import { useI18n } from '@/shared/i18n';
import { FootnoteText, Icon } from '@/shared/ui';
import { type IconNames } from '@/shared/ui/Icon/data';

const TRACK_MAP: Record<TrackId, { title: string; icon: IconNames }> = {
  0: { title: 'governance.referendums.mainAgenda', icon: 'polkadot' },
  1: { title: 'governance.referendums.fellowshipWhitelist', icon: 'fellowship' },
  2: { title: 'governance.referendums.wishForChange', icon: 'voting' },
  10: { title: 'governance.referendums.staking', icon: 'stake' },
  11: { title: 'governance.referendums.treasuryAny', icon: 'treasury' },
  12: { title: 'governance.referendums.governanceLease', icon: 'voting' },
  13: { title: 'governance.referendums.fellowshipAdmin', icon: 'fellowship' },
  14: { title: 'governance.referendums.governanceRegistrar', icon: 'voting' },
  15: { title: 'governance.referendums.crowdloans', icon: 'rocket' },
  20: { title: 'governance.referendums.governanceCanceller', icon: 'voting' },
  21: { title: 'governance.referendums.governanceKiller', icon: 'voting' },
  30: { title: 'governance.referendums.treasurySmallTips', icon: 'treasury' },
  31: { title: 'governance.referendums.treasuryBigTips', icon: 'treasury' },
  32: { title: 'governance.referendums.treasurySmallSpend', icon: 'treasury' },
  33: { title: 'governance.referendums.treasuryMediumSpend', icon: 'treasury' },
  34: { title: 'governance.referendums.treasuryBigSpend', icon: 'treasury' },
};

const DEFAULT_TRACK = { title: 'governance.referendums.unknownTrack', icon: 'voting' as IconNames };

export function getTrackMeta(trackId: TrackId): { title: string; icon: IconNames } {
  return TRACK_MAP[trackId] ?? DEFAULT_TRACK;
}

type Props = {
  trackId: TrackId;
  className?: string;
};

export const TrackInfo = memo(({ trackId, className }: Props) => {
  const { t } = useI18n();
  const { title, icon } = getTrackMeta(trackId);

  return (
    <div className={className ?? 'flex items-center gap-1'}>
      <Icon name={icon} size={14} className="shrink-0 text-text-secondary" />
      <FootnoteText className="truncate text-text-secondary">{t(title)}</FootnoteText>
    </div>
  );
});
