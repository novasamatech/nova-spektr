import { useUnit } from 'effector-react';

import { useI18n } from '@/shared/i18n';
import { Button, DetailRow, FootnoteText, SmallTitleText } from '@/shared/ui';
import { AssetBalance } from '@/entities/asset';
import { delegateDetailsModel } from '../model/delegate-details-model';
import { delegateSummaryModel } from '../model/delegate-summary-model';

export const DelegateActivity = () => {
  const { t } = useI18n();

  const chain = useUnit(delegateDetailsModel.$chain);
  const delegate = useUnit(delegateDetailsModel.$delegate);

  if (!delegate) return null;

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <SmallTitleText>{t('governance.addDelegation.delegateActivity')}</SmallTitleText>
        <Button
          pallet="primary"
          variant="text"
          size="sm"
          className="px-0"
          onClick={() => delegateSummaryModel.events.openSummaryModal()}
        >
          {t('governance.addDelegation.viewSummary')}
        </Button>
      </div>

      <DetailRow
        label={<FootnoteText className="text-text-secondary">{t('governance.addDelegation.card.votes')}</FootnoteText>}
      >
        <AssetBalance
          showSymbol={false}
          value={delegate.delegatorVotes?.toString() || '0'}
          asset={chain?.assets[0]}
          className="text-footnote"
        />
      </DetailRow>

      <DetailRow
        label={
          <FootnoteText className="text-text-secondary">{t('governance.addDelegation.card.delegations')}</FootnoteText>
        }
      >
        <FootnoteText>{delegate.delegators || '0'}</FootnoteText>
      </DetailRow>

      <DetailRow
        label={<FootnoteText className="text-text-secondary">{t('governance.addDelegation.card.voted')}</FootnoteText>}
      >
        <FootnoteText>{delegate.delegateVotesMonth || '0'}</FootnoteText>
      </DetailRow>
      <DetailRow
        label={
          <FootnoteText className="text-text-secondary">{t('governance.addDelegation.votedAllTime')}</FootnoteText>
        }
      >
        <FootnoteText>{delegate.delegateVotes || '0'}</FootnoteText>
      </DetailRow>
    </div>
  );
};
