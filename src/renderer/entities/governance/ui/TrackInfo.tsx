import { useI18n } from '@/app/providers';
import { type TrackId } from '@/shared/core';
import { FootnoteText, Icon } from '@/shared/ui';
import { type IconNames } from '@/shared/ui/Icon/data';

function getTrackInfo(trackId: TrackId): { title: string; icon: IconNames } {
  const names: Record<TrackId, { title: string; icon: IconNames }> = {
    0: { title: 'governance.referendums.mainAgenda', icon: 'polkadot' }, // 'root',
    1: { title: 'governance.referendums.fellowshipWhitelist', icon: 'fellowship' }, // 'whitelisted_caller',
    2: { title: 'governance.referendums.wishForChange', icon: 'voting' }, // 'wish_for_change',
    10: { title: 'governance.referendums.staking', icon: 'stake' }, // 'staking_admin',
    11: { title: 'governance.referendums.treasuryAny', icon: 'treasury' }, // 'treasurer',
    12: { title: 'governance.referendums.governanceLease', icon: 'voting' }, // 'lease_admin',
    13: { title: 'governance.referendums.fellowshipAdmin', icon: 'fellowship' }, // 'fellowship_admin',
    14: { title: 'governance.referendums.governanceRegistrar', icon: 'voting' }, // 'general_admin',
    15: { title: 'governance.referendums.crowdloans', icon: 'rocket' }, // 'auction_admin',
    20: { title: 'governance.referendums.governanceCanceller', icon: 'voting' }, // 'referendum_canceller',
    21: { title: 'governance.referendums.governanceKiller', icon: 'voting' }, // 'referendum_killer',
    30: { title: 'governance.referendums.treasurySmallTips', icon: 'treasury' }, // 'small_tipper',
    31: { title: 'governance.referendums.treasuryBigTips', icon: 'treasury' }, // 'big_tipper',
    32: { title: 'governance.referendums.treasurySmallSpend', icon: 'treasury' }, // 'small_spender',
    33: { title: 'governance.referendums.treasuryMediumSpend', icon: 'treasury' }, // 'medium_spender',
    34: { title: 'governance.referendums.treasuryBigSpend', icon: 'treasury' }, // 'big_spender',
  };

  return names[trackId] || { title: 'Unknown track', icon: 'voting' };
}

type Props = {
  trackId: TrackId;
};

export const TrackInfo = ({ trackId }: Props) => {
  const { t } = useI18n();

  const { title, icon } = getTrackInfo(trackId);

  return (
    <div className="ml-auto flex text-text-secondary">
      <Icon name={icon} size={16} className="ml-2 mr-1 text-inherit" />
      <FootnoteText className="text-inherit">{t(title)}</FootnoteText>
    </div>
  );
};
