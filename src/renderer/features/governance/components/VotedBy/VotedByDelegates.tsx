import { BN_ZERO } from '@polkadot/util';
import { Trans } from 'react-i18next';

import { type DelegateInfo } from '@/shared/api/governance';
import { TEST_IDS } from '@/shared/constants';
import { type Address, type Asset, type Identity } from '@/shared/core';
import { useI18n } from '@/shared/i18n';
import { nonNullable } from '@/shared/lib/utils';
import { FootnoteText, Icon } from '@/shared/ui';
import { Address as AccountAddress, AssetBalance } from '@/shared/ui-entities';
import { locksService } from '@/entities/governance';

type Props = {
  asset: Asset;
  identity: Record<Address, Identity>;
  delegates: DelegateInfo[];
  multiplier?: boolean;
};

export const VotedByDelegates = ({ asset, identity, delegates, multiplier }: Props) => {
  const { t } = useI18n();

  if (delegates.length === 1) {
    const delegate = delegates[0];

    const delegateName = nonNullable(identity[delegate.delegateAddress]) ? (
      <span className="truncate">{identity[delegate.delegateAddress].parent.name}</span>
    ) : (
      <AccountAddress showIcon={false} variant="short" address={delegate.delegateAddress} />
    );

    const amount = <AssetBalance className="text-icon-alert" value={delegate.amount} asset={asset} />;

    const i18nKey: Record<'aye' | 'nay', string> = {
      aye: multiplier ? 'governance.votedConvictedAyeBy' : 'governance.votedAyeBy',
      nay: multiplier ? 'governance.votedConvictedNayBy' : 'governance.votedNayBy',
    };

    const conviction = multiplier ? locksService.getLockPeriodsMultiplier(delegate.conviction) : undefined;

    return (
      <div className="flex w-full items-center gap-x-1" data-testid={TEST_IDS.GOVERNANCE.PROPOSAL_VOTE_DETAILS}>
        <Icon name="voted" size={16} className="text-icon-alert shrink-0" />
        <FootnoteText className="text-icon-alert flex items-center gap-x-0.5 truncate text-nowrap whitespace-nowrap">
          <Trans
            t={t}
            i18nKey={i18nKey[delegate.decision]}
            values={{ multiplier: conviction }}
            components={{ amount, delegate: delegateName }}
          />
        </FootnoteText>
      </div>
    );
  }

  const isDelegatesAye = delegates.every((d) => d.decision === 'aye');
  const isDelegatesNay = delegates.every((d) => d.decision === 'nay');

  if (isDelegatesAye || isDelegatesNay) {
    const delegatedAmount = delegates.reduce((acc, delegate) => acc.add(delegate.amount), BN_ZERO);

    return (
      <div className="flex w-full items-center gap-x-1">
        <Icon name="voted" size={16} className="text-icon-alert shrink-0" />
        <FootnoteText className="text-icon-alert flex items-center gap-x-0.5 truncate text-nowrap whitespace-nowrap">
          <Trans
            t={t}
            i18nKey={`governance.${isDelegatesAye ? 'votedAyeByDelegates' : 'votedNayByDelegates'}`}
            components={{
              amount: <AssetBalance className="text-icon-alert" asset={asset} value={delegatedAmount} />,
            }}
          />
        </FootnoteText>
      </div>
    );
  }

  return (
    <div className="flex w-full items-center gap-x-1">
      <Icon name="voted" size={16} className="text-icon-alert shrink-0" />
      <FootnoteText className="text-icon-alert">{t('governance.votedByDelegates')}</FootnoteText>
    </div>
  );
};
