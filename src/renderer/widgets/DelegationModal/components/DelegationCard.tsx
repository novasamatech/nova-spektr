import { useUnit } from 'effector-react';

import { useI18n } from '@/app/providers';
import { type DelegateAccount } from '@/shared/api/governance';
import { cnTw } from '@/shared/lib/utils';
import { BodyText, CaptionText, Card, FootnoteText, HeadlineText, Icon, Identicon, Truncate } from '@/shared/ui';
import { AssetBalance } from '@/entities/asset';
import { networkSelectorModel } from '@/features/governance';
import { addDelegationUtils } from '../common/utils';

type Props = {
  delegate: DelegateAccount;
};

export const DelegationCard = ({ delegate }: Props) => {
  const { t } = useI18n();

  const chain = useUnit(networkSelectorModel.$governanceChain);
  const delegateTitle = delegate.name || (
    <div className="max-w-[200px]">
      <Truncate ellipsis="..." start={4} end={4} text={delegate.accountId} />
    </div>
  );

  const delegateBadge = delegate.name && (
    <CaptionText
      className={cnTw(
        'rounded-full px-2 py-1 uppercase',
        delegate.isOrganization
          ? 'bg-badge-orange-background-default text-text-warning'
          : 'bg-badge-background text-icon-accent',
      )}
    >
      {t('governance.addDelegation.card.' + (delegate.isOrganization ? 'organization' : 'individual'))}
    </CaptionText>
  );

  return (
    <Card as="li">
      <div className="flex flex-col gap-4">
        <div className="flex gap-3">
          <DelegateIcon delegate={delegate} />

          <div className="flex items-center gap-2.5">
            <HeadlineText>{delegateTitle}</HeadlineText>

            {delegateBadge}
          </div>
        </div>
        <div className="flex flex-col gap-2.5">
          {delegate.shortDescription && <FootnoteText>{delegate.shortDescription}</FootnoteText>}

          <div className="flex gap-6 divide-x divide-divider">
            {delegate.delegators && (
              <div className="flex flex-col gap-1">
                <FootnoteText className="text-text-secondary">
                  {t('governance.addDelegation.card.delegations')}
                </FootnoteText>
                <BodyText>{delegate.delegators}</BodyText>
              </div>
            )}

            {delegate.delegatorVotes && (
              <div className="flex flex-col gap-1 pl-6">
                <FootnoteText className="text-text-secondary">{t('governance.addDelegation.card.votes')}</FootnoteText>
                <BodyText>
                  <AssetBalance
                    showSymbol={false}
                    value={delegate.delegatorVotes.toString()}
                    asset={chain?.assets[0]}
                  />
                </BodyText>
              </div>
            )}

            {delegate.delegateVotes && (
              <div className="flex flex-col gap-1 pl-6">
                <FootnoteText className="text-text-secondary">{t('governance.addDelegation.card.voted')}</FootnoteText>
                <BodyText>{delegate.delegateVotes}</BodyText>
              </div>
            )}
          </div>
        </div>
      </div>
    </Card>
  );
};

export const DelegateIcon = ({ delegate }: Props) => {
  if (!delegate.name) return <Identicon address={delegate.accountId} size={46} />;

  if (addDelegationUtils.isDefaultImage(delegate.image)) {
    <div
      className={cnTw(
        'flex h-11.5 w-11.5 items-center justify-center rounded-full',
        delegate.isOrganization ? 'bg-badge-orange-background-default' : 'bg-badge-background',
      )}
    >
      {delegate.isOrganization ? (
        <Icon className="text-icon-warning" name="organization" />
      ) : (
        <Icon className="text-icon-accent" name="individual" />
      )}
    </div>;
  }

  return <img src={delegate.image} alt={delegate.name} className={cnTw('h-11.5 w-11.5 rounded-full')} />;
};
