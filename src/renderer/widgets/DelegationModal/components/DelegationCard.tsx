import { type DelegateAccount } from '@/shared/api/governance';
import { type Asset } from '@/shared/core';
import { useI18n } from '@/shared/i18n';
import { cnTw } from '@/shared/lib/utils';
import { BodyText, FootnoteText } from '@/shared/ui';
import { AssetBalance } from '@/shared/ui-entities';
import { DelegateName } from '@/features/governance';

type Props = {
  asset: Asset;
  delegate: DelegateAccount;
  onClick: () => void;
};

export const DelegationCard = ({ asset, delegate, onClick }: Props) => {
  const { t } = useI18n();

  return (
    <button
      className={cnTw(
        'w-full rounded-sm border border-container-border bg-card-background p-4 transition-shadow',
        'cursor-pointer shadow-shadow-1 hover:shadow-shadow-2 focus:shadow-shadow-2',
      )}
      onClick={onClick}
    >
      <div className="flex flex-col gap-4">
        <DelegateName delegate={delegate} titleClassName="max-w-[200px]" />
        <div className="flex flex-col gap-2.5">
          <FootnoteText>{delegate.shortDescription}</FootnoteText>

          <div className="grid grid-cols-[1fr_100px_128px] gap-x-5">
            <div className="flex flex-col gap-1">
              <FootnoteText className="text-text-tertiary">{t('governance.addDelegation.card.votes')}</FootnoteText>
              <BodyText>
                <AssetBalance value={delegate.delegatorVotes || '0'} asset={asset} />
              </BodyText>
            </div>

            <div className="flex flex-col gap-1 border-l border-divider pl-5">
              <FootnoteText className="text-text-tertiary">
                {t('governance.addDelegation.card.delegations')}
              </FootnoteText>
              <BodyText>{delegate.delegators || '0'}</BodyText>
            </div>

            <div className="flex flex-col gap-1 border-l border-divider pl-5">
              <FootnoteText className="text-text-tertiary">{t('governance.addDelegation.card.voted')}</FootnoteText>
              <BodyText>{delegate.delegateVotesMonth || '0'}</BodyText>
            </div>
          </div>
        </div>
      </div>
    </button>
  );
};
