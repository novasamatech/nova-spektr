import { useStoreMap } from 'effector-react';
import { Trans } from 'react-i18next';

import { useI18n } from '@app/providers';
import { type Address } from '@shared/core';
import { FootnoteText, Icon } from '@shared/ui';
import { AccountAddress } from '@entities/wallet';
import { proposerIdentityAggregate } from '../../aggregates/proposerIdentity';

type Props = {
  address?: Address | null;
};

export const VotedBy = ({ address }: Props) => {
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
      <FootnoteText className="flex truncate text-nowrap text-icon-accent">
        <Trans t={t} i18nKey="governance.votedBy" components={{ name }} />
      </FootnoteText>
    </div>
  );
};
