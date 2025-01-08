import { type BN, BN_ZERO } from '@polkadot/util';
import { useUnit } from 'effector-react';

import { type DelegateAccount } from '@/shared/api/governance';
import { type Conviction } from '@/shared/core';
import { useI18n } from '@/shared/i18n';
import { BodyText, FootnoteText } from '@/shared/ui';
import { AssetBalance } from '@/entities/asset';
import { votingService } from '@/entities/governance';
import { DelegateName, networkSelectorModel } from '@/features/governance';

type Props = {
  delegate: DelegateAccount;
  votes?: {
    conviction: Conviction;
    balance: BN;
  }[];
  tracks?: string[];
};

export const DelegationCard = ({ delegate, votes, tracks }: Props) => {
  const { t } = useI18n();

  const chain = useUnit(networkSelectorModel.$governanceChain);

  const totalVotes = votes?.reduce(
    (acc, { balance, conviction }) => acc.add(votingService.calculateVotingPower(balance, conviction)),
    BN_ZERO,
  );

  return (
    <li className="rounded border border-container-border bg-white p-4 shadow-card-shadow">
      <div className="flex flex-col gap-4">
        <DelegateName
          delegate={delegate}
          asset={chain?.assets[0]}
          votes={totalVotes}
          tracks={tracks}
          titleClassName="max-w-[200px]"
        />
        <div className="flex flex-col gap-2.5">
          {delegate.shortDescription && <FootnoteText>{delegate.shortDescription}</FootnoteText>}

          <div className="flex gap-6 divide-x divide-divider">
            <div className="flex flex-col gap-1">
              <FootnoteText className="text-text-secondary">
                {t('governance.addDelegation.card.delegations')}
              </FootnoteText>
              <BodyText>{delegate.delegators || '0'}</BodyText>
            </div>

            <div className="flex flex-col gap-1 pl-6">
              <FootnoteText className="text-text-secondary">{t('governance.addDelegation.card.votes')}</FootnoteText>
              <BodyText>
                <AssetBalance
                  showSymbol={false}
                  value={delegate.delegatorVotes?.toString() || '0'}
                  asset={chain?.assets[0]}
                />
              </BodyText>
            </div>

            <div className="flex flex-col gap-1 pl-6">
              <FootnoteText className="text-text-secondary">{t('governance.addDelegation.card.voted')}</FootnoteText>
              <BodyText>{delegate.delegateVotesMonth || '0'}</BodyText>
            </div>
          </div>
        </div>
      </div>
    </li>
  );
};
