import { memo } from 'react';

import { nonNullable } from '@/shared/lib/utils';
import { Icon } from '@/shared/ui';
import { type Fellowship } from '@/shared/ui/Icon/data/fellowship';
import { Skeleton } from '@/shared/ui-kit';

type Props = {
  rank?: number | null;
  isPromotion?: boolean;
  isRetention?: boolean;
  isRFC?: boolean;
  isWhitelist?: boolean;
};

export const TaskBadge = memo(({ rank, isPromotion, isRetention, isRFC, isWhitelist }: Props) => {
  let iconName: Fellowship | undefined;

  if (nonNullable(rank) && rank >= 1 && rank <= 9) {
    if (isRetention) {
      iconName = `retentionRank${rank}` as Fellowship;
    } else if (isPromotion) {
      iconName = `promotionRank${rank}` as Fellowship;
    }
  }

  if (isRFC) {
    iconName = 'rfc' as Fellowship;
  }

  if (isWhitelist) {
    iconName = 'whitelist' as Fellowship;
  }

  if (!iconName) {
    // Fallback or handle error if iconName could not be determined
    return <Skeleton height={5} width={10} />; // Or some default icon/error display
  }

  return <BadgeIcon iconName={iconName} />;
});

export const BadgeIcon = ({ iconName }: { iconName: Fellowship }) => {
  return <Icon name={iconName} className="-mt-[10px]" size={40} />;
};
