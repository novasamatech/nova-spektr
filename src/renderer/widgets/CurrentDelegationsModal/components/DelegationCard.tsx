import { type BN, BN_ZERO } from '@polkadot/util';
import { useMemo } from 'react';

import { type DelegateAccount } from '@/shared/api/governance';
import { type Asset, type Conviction } from '@/shared/core';
import { useI18n } from '@/shared/i18n';
import { cnTw } from '@/shared/lib/utils';
import { BodyText, FootnoteText } from '@/shared/ui';
import { AssetBalance } from '@/entities/asset';
import { votingService } from '@/entities/governance';
import { DelegateName } from '@/features/governance';

type Props = {
  asset: Asset;
  delegate: DelegateAccount;
  votes?: {
    conviction: Conviction;
    balance: BN;
  }[];
  onClick: () => void;
};

export const DelegationCard = ({ asset, delegate, votes = [], onClick }: Props) => {
  const { t } = useI18n();

  const { totalVotes, totalVotingPower } = useMemo(() => {
    const result = {
      totalVotes: BN_ZERO,
      totalVotingPower: BN_ZERO,
    };

    for (const { balance, conviction } of votes) {
      result.totalVotes = result.totalVotes.add(balance);
      result.totalVotingPower = result.totalVotingPower.add(votingService.calculateVotingPower(balance, conviction));
    }

    return result;
  }, [votes.length]);

  return (
    <button
      className={cnTw(
        'w-full rounded border border-container-border bg-white p-4 transition-shadow',
        'shadow-shadow-1 hover:shadow-shadow-2 focus:shadow-shadow-2',
      )}
      onClick={onClick}
    >
      <div className="flex flex-col gap-4">
        <DelegateName delegate={delegate} titleClassName="max-w-[200px]" />
        <div className="flex flex-col gap-2.5">
          <FootnoteText>{delegate.shortDescription}</FootnoteText>

          <div className="grid grid-cols-2">
            <div className="flex flex-col gap-1">
              <FootnoteText className="text-text-secondary">
                {t('governance.addDelegation.card.lockedAmount')}
              </FootnoteText>
              <BodyText>
                <AssetBalance value={totalVotes} asset={asset} />
              </BodyText>
            </div>

            <div className="flex flex-col gap-1 divide-divider border-l pl-5">
              <FootnoteText className="text-text-secondary">
                {t('governance.addDelegation.card.votingPower')}
              </FootnoteText>
              <BodyText>
                <AssetBalance value={totalVotingPower} asset={asset} />
              </BodyText>
            </div>
          </div>
        </div>
      </div>
    </button>
  );
};
