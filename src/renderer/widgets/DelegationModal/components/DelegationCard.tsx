import { useUnit } from 'effector-react';

import { type DelegateAccount } from '@/shared/api/governance';
import { useI18n } from '@/shared/i18n';
import { BodyText, FootnoteText } from '@/shared/ui';
import { AssetBalance } from '@/entities/asset';
import { DelegateName, networkSelectorModel } from '@/features/governance';

type Props = {
  delegate: DelegateAccount;
};

export const DelegationCard = ({ delegate }: Props) => {
  const { t } = useI18n();

  const chain = useUnit(networkSelectorModel.$governanceChain);

  return (
    <li className="rounded border border-container-border bg-white p-4 shadow-card-shadow">
      <div className="flex flex-col gap-4">
        <DelegateName delegate={delegate} titleClassName="max-w-[200px]" />
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
