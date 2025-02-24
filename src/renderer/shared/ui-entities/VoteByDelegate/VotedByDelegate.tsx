import { memo } from 'react';
import { Trans } from 'react-i18next';

import { type DelegateInfo } from '@/shared/api/governance';
import { type Asset } from '@/shared/core';
import { useI18n } from '@/shared/i18n';
import { FootnoteText, Icon } from '@/shared/ui';
import { AssetBalance } from '@/entities/asset';
import { votingService } from '@/entities/governance';
import { Address as AccountAddress } from '../Address/Address';

type Props = {
  asset: Asset;
  voterName?: string;
  delegateInfo: DelegateInfo;
};

export const VotedByDelegate = memo(({ asset, voterName, delegateInfo }: Props) => {
  const { t } = useI18n();

  const delegate = voterName ? (
    <span>{voterName}</span>
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
