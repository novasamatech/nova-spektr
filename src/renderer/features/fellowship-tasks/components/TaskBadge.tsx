import { memo } from 'react';

import { nonNullable } from '@/shared/lib/utils';
import { Icon, type IconNames } from '@/shared/ui';
import { Skeleton } from '@/shared/ui-kit';
import { type Proposal, referendumService } from '@/domains/collectives';

type Props = {
  rank?: number | null;
  isPromotion?: boolean;
  isRetention?: boolean;
  proposal?: Proposal | null;
};

export const TaskBadge = memo(({ rank, isPromotion, isRetention, proposal }: Props) => {
  let iconName: IconNames | undefined;

  if (nonNullable(rank) && rank >= 1 && rank <= 9) {
    if (isRetention) {
      iconName = `retentionRank${rank}` as IconNames;
    } else if (isPromotion) {
      iconName = `promotionRank${rank}` as IconNames;
    }
  }

  const isRFCProposal = proposal ? referendumService.isRfcProposal(proposal) : false;
  const isWhitelistProposal = proposal ? referendumService.isWhitelistProposal(proposal) : false;
  const isSpendProposal = proposal ? referendumService.isSpendProposal(proposal) : false;

  //todo blocked, waiting for the icon from the design team
  // const isUnknownProposal = proposal ? referendumService.isUnknownProposal(proposal) : false;

  if (isRFCProposal) {
    iconName = 'rfc';
  }

  if (isWhitelistProposal) {
    iconName = 'whitelist';
  }

  if (isSpendProposal) {
    iconName = 'spend';
  }

  if (!iconName) {
    // Fallback or handle error if iconName could not be determined
    return <Skeleton height={5} width={10} />; // Or some default icon/error display
  }

  return <BadgeIcon iconName={iconName} />;
});

export const BadgeIcon = ({ iconName }: { iconName: IconNames }) => {
  return <Icon name={iconName} className="-mt-[10px]" size={40} />;
};
