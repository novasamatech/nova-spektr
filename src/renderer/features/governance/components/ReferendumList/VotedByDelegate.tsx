import { useStoreMap } from 'effector-react';
import { memo } from 'react';
import { Trans } from 'react-i18next';

import { type DelegateInfo } from '@/shared/api/governance';
import { type Asset } from '@/shared/core';
import { useI18n } from '@/shared/i18n';
import { nullable } from '@/shared/lib/utils';
import { FootnoteText, Icon } from '@/shared/ui';
import { Address as AccountAddress } from '@/shared/ui-entities';
import { AssetBalance } from '@/entities/asset';
import { votingService } from '@/entities/governance';
import { proposerIdentityAggregate } from '../../aggregates/proposerIdentity';

type Props = {
  asset: Asset;
  delegateInfo?: DelegateInfo | null;
};

export const VotedByDelegate = memo(({ asset, delegateInfo }: Props) => {
  const { t } = useI18n();

  const voter = useStoreMap({
    store: proposerIdentityAggregate.$proposers,
    keys: [delegateInfo?.delegateId],
    fn: (proposers, [delegateId]) => (delegateId ? (proposers[delegateId] ?? null) : null),
  });

  if (nullable(delegateInfo?.delegateId)) {
    return null;
  }

  const delegate = voter?.parent.name ? (
    <span>{voter.parent.name}</span>
  ) : (
    <AccountAddress showIcon={false} variant="short" address={delegateInfo.delegateId} />
  );

  const amount = (
    <AssetBalance
      className="text-icon-accent"
      value={votingService.calculateVotingPower(delegateInfo.amount, delegateInfo.conviction)}
      asset={asset}
    />
  );

  return (
    <div className="flex items-center gap-x-1">
      <Icon name="voted" size={16} className="text-icon-accent" />
      <FootnoteText className="flex max-w-56 items-center gap-x-0.5 truncate whitespace-nowrap text-nowrap text-icon-accent">
        <Trans
          t={t}
          i18nKey={`governance.${delegateInfo.decision === 'aye' ? 'votedAyeBy' : 'votedNayBy'}`}
          components={{ amount, delegate }}
        />
      </FootnoteText>
    </div>
  );
});
