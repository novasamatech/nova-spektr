import { useUnit } from 'effector-react';

import { useI18n } from '@/app/providers';
import { type DelegateAccount } from '@/shared/api/governance';
import { cnTw } from '@/shared/lib/utils';
import { BodyText, Card, FootnoteText, HeadlineText, Icon, Identicon, Truncate } from '@/shared/ui';
import { AssetBalance } from '@/entities/asset';
import { networkSelectorModel } from '@/features/governance';

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
          {delegate.name ? (
            <>
              {delegate.image && !delegate.image.includes('default') ? (
                <img src={delegate.image} alt={delegate.name} className={cnTw('w-11.5 h-11.5 rounded-full')} />
              ) : (
                <div
                  className={cnTw(
                    'w-11.5 h-11.5 flex items-center justify-center rounded-full',
                    delegate.isOrganization ? 'bg-badge-orange-background-default' : 'bg-badge-background',
                  )}
                >
                  {delegate.isOrganization ? (
                    <Icon className="text-icon-warning" name="organization" />
                  ) : (
                    <Icon className="text-icon-accent" name="individual" />
                  )}
                </div>
              )}
            </>
          ) : (
            <Identicon address={delegate.accountId} size={46} />
          )}
          <div className="flex gap-2.5 items-center">
            <HeadlineText>
              {delegate.name || (
                <div className="max-w-[200px]">
                  <Truncate ellipsis="..." start={4} end={4} text={delegate.accountId} />
                </div>
              )}
            </HeadlineText>
            <div></div>
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
            <div className="flex pl-6 flex-col gap-1">
              <FootnoteText className="text-text-secondary">{t('governance.addDelegation.card.votes')}</FootnoteText>
              <BodyText>
                {(delegate.delegatorVotes && (
                  <AssetBalance
                    showSymbol={false}
                    value={delegate.delegatorVotes.toString()}
                    asset={chain?.assets[0]}
                  />
                )) ||
                  '0'}
              </BodyText>
            </div>
            <div className="flex pl-6 flex-col gap-1">
              <FootnoteText className="text-text-secondary">{t('governance.addDelegation.card.voted')}</FootnoteText>
              <BodyText>{delegate.delegateVotes || '0'}</BodyText>
            </div>
          </div>
        </div>
      </div>
    </Card>
  );
};
