import { useStoreMap } from 'effector-react';
import { memo } from 'react';

import { type Address } from '@/shared/core';
import { useI18n } from '@/shared/i18n';
import { FootnoteText, Icon } from '@/shared/ui';
import { AccountAddress } from '@/entities/wallet';
import { proposerIdentityAggregate } from '../../aggregates/proposerIdentity';

type Props = {
  address?: Address | null;
};

export const VotedBy = memo(({ address }: Props) => {
  const { t } = useI18n();

  const voter = useStoreMap({
    store: proposerIdentityAggregate.$proposers,
    keys: [address],
    fn: (proposers, [address]) => (address ? (proposers[address] ?? null) : null),
  });

  if (!address) {
    return null;
  }

  const name = voter?.parent.name ? (
    <span>{voter.parent.name}</span>
  ) : (
    <AccountAddress showIcon={false} type="short" address={address} />
  );

  return (
    <div className="flex items-center gap-x-1">
      <Icon name="voted" size={16} className="text-icon-accent" />
      <FootnoteText className="flex max-w-56 truncate whitespace-nowrap text-nowrap text-icon-accent">
        {t('governance.votedBy')}&nbsp;{name}
      </FootnoteText>
    </div>
  );
});
