import { useUnit } from 'effector-react';

import { useI18n } from '@/app/providers';
import { type DelegateAccount } from '@/shared/api/governance';
import { BodyText, Card, FootnoteText } from '@/shared/ui';
import { AssetBalance } from '@/entities/asset';
import { DelegateBadge, DelegateIcon, DelegateTitle, networkSelectorModel } from '@/features/governance';

type Props = {
  delegate: DelegateAccount;
};

export const DelegationCard = ({ delegate }: Props) => {
  const { t } = useI18n();

  const chain = useUnit(networkSelectorModel.$governanceChain);

  return (
    <Card as="li">
      <div className="flex flex-col gap-4">
        <div className="flex gap-3">
          <DelegateIcon delegate={delegate} />

          <div className="flex items-center justify-between gap-2.5">
            <DelegateTitle delegate={delegate} className="max-w-[200px]" />
            <DelegateBadge delegate={delegate} />
          </div>
        </div>
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
              <BodyText>{delegate.delegateVotes || '0'}</BodyText>
            </div>
          </div>
        </div>
      </div>
    </Card>
  );
};
