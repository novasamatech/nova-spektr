import { FootnoteText } from '@shared/ui';
import { referendumService } from '@entities/governance';
import { useI18n } from '@app/providers';
import { AggregatedReferendum } from '../../types/structs';
import { formatBalance } from '@shared/lib/utils';

type Props = {
  item: AggregatedReferendum;
};

export const VotingSummary = ({ item }: Props) => {
  const { t } = useI18n();
  const { referendum } = item;

  if (!referendumService.isOngoing(referendum)) {
    return;
  }

  const ayeBalance = formatBalance(referendum.tally.ayes.toString(), 0);
  const naysBalance = formatBalance(referendum.tally.nays.toString(), 0);

  return (
    <div className="flex flex-col items-start gap-3">
      <div className="flex gap-2 items-center w-full">
        <div className="w-1 h-3 rounded-[4px] bg-icon-positive" />
        <FootnoteText>{t('governance.referendum.aye')}</FootnoteText>
        <FootnoteText className="text-end grow">
          {t('governance.referendum.votes', { votes: ayeBalance.suffix })}
        </FootnoteText>
      </div>
      <div className="flex gap-2 items-center w-full">
        <div className="w-1 h-3 rounded-[4px] bg-icon-negative" />
        <FootnoteText>{t('governance.referendum.nay')}</FootnoteText>
        <FootnoteText className="text-end grow">
          {/*{t('governance.referendum.votes', { votes: naysBalance.value + naysBalance.suffix })}*/}
          {t('governance.referendum.votes', { votes: referendum.tally.nays.toString() })}
        </FootnoteText>
      </div>
      <div className="flex gap-2 items-center w-full">
        <div className="w-1 h-3 rounded-[4px] bg-icon-default" />
        <FootnoteText>{t('governance.referendum.support')}</FootnoteText>
        <FootnoteText className="text-end grow">
          {t('governance.referendum.votes', { votes: referendum.tally.support.toString() })}
        </FootnoteText>
      </div>
    </div>
  );
};
