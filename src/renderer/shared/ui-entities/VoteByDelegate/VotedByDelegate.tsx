import { type BN } from '@polkadot/util';
import { memo } from 'react';
import { Trans } from 'react-i18next';

import { type Address, type Asset } from '@/shared/core';
import { useI18n } from '@/shared/i18n';
import { FootnoteText, Icon } from '@/shared/ui';
import { Address as AccountAddress } from '../Address/Address';
import { AssetBalance } from '../AssetBalance/AssetBalance';

type Props = {
  asset: Asset;
  address: Address;
  voterName?: string;
  votingPower: BN;
  decision: 'aye' | 'nay';
  testId?: string;
};

export const VotedByDelegate = memo(({ asset, address, voterName, votingPower, decision, testId }: Props) => {
  const { t } = useI18n();

  const delegate = voterName ? (
    <span>{voterName}</span>
  ) : (
    <AccountAddress showIcon={false} variant="short" address={address} />
  );

  const amount = <AssetBalance className="text-icon-accent" value={votingPower} asset={asset} />;

  return (
    <div className="flex items-center gap-x-1" data-testid={testId}>
      <Icon name="voted" size={16} className="text-icon-accent" />
      <FootnoteText className="flex max-w-56 items-center gap-x-0.5 truncate text-nowrap whitespace-nowrap text-icon-accent">
        <Trans
          t={t}
          i18nKey={`governance.${decision === 'aye' ? 'votedAyeBy' : 'votedNayBy'}`}
          components={{ amount, delegate }}
        />
      </FootnoteText>
    </div>
  );
});
