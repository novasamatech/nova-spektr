import { BN_ZERO } from '@polkadot/util';
import { Trans } from 'react-i18next';

import { type DelegateInfo } from '@/shared/api/governance';
import { type Address, type Asset, type Identity } from '@/shared/core';
import { useI18n } from '@/shared/i18n';
import { nonNullable } from '@/shared/lib/utils';
import { FootnoteText, Icon } from '@/shared/ui';
import { Address as AccountAddress, AssetBalance } from '@/shared/ui-entities';
import { votingService } from '@/entities/governance';

type Props = {
  asset: Asset;
  identity: Record<Address, Identity>;
  delegates: DelegateInfo[];
};

export const VotedByDelegates = ({ asset, identity, delegates }: Props) => {
  const { t } = useI18n();

  if (delegates.length === 1) {
    const delegate = delegates[0];

    const delegateName = nonNullable(identity[delegate.delegateId]) ? (
      <span>{identity[delegate.delegateId].parent.name}</span>
    ) : (
      <AccountAddress showIcon={false} variant="short" address={delegate.delegateId} />
    );

    const amount = (
      <AssetBalance
        className="text-icon-accent"
        value={votingService.calculateVotingPower(delegate.amount, delegate.conviction)}
        asset={asset}
      />
    );

    return (
      <div className="flex items-center gap-x-1">
        <Icon name="voted" size={16} className="text-icon-accent" />
        <FootnoteText className="flex items-center gap-x-0.5 truncate whitespace-nowrap text-nowrap text-icon-accent">
          <Trans
            t={t}
            i18nKey={`governance.${delegate.decision === 'aye' ? 'votedAyeBy' : 'votedNayBy'}`}
            components={{ amount, delegate: delegateName }}
          />
        </FootnoteText>
      </div>
    );
  }

  const isDelegatesAye = delegates.every((d) => d.decision === 'aye');
  const isDelegatesNay = delegates.every((d) => d.decision === 'nay');

  if (isDelegatesAye || isDelegatesNay) {
    const delegatedAmount = delegates.reduce((acc, delegate) => {
      return acc.add(votingService.calculateVotingPower(delegate.amount, delegate.conviction));
    }, BN_ZERO);

    return (
      <div className="flex items-center gap-x-1">
        <Icon name="voted" size={16} className="text-icon-accent" />
        <FootnoteText className="flex items-center gap-x-0.5 truncate whitespace-nowrap text-nowrap text-icon-accent">
          <Trans
            t={t}
            i18nKey={`governance.${isDelegatesAye ? 'votedAyeByDelegates' : 'votedNayByDelegates'}`}
            components={{
              amount: <AssetBalance className="text-icon-accent" asset={asset} value={delegatedAmount} />,
            }}
          />
        </FootnoteText>
      </div>
    );
  }

  return (
    <div className="flex items-center gap-x-1">
      <Icon name="voted" size={16} className="text-icon-accent" />
      <FootnoteText className="text-icon-accent">{t('governance.votedByDelegates')}</FootnoteText>
    </div>
  );
};
