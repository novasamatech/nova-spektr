import { useI18n } from '@app/providers';

import { type Asset } from '@shared/core';
import { formatBalance } from '@shared/lib/utils';
import { FootnoteText } from '@shared/ui';

import { referendumService } from '@entities/governance';

import { type AggregatedReferendum } from '../../types/structs';

type Props = {
  referendum: AggregatedReferendum;
  asset: Asset;
};

export const VotingSummary = ({ referendum, asset }: Props) => {
  const { t } = useI18n();

  if (!referendumService.isOngoing(referendum)) {
    return null;
  }

  const ayeBalance = formatBalance(referendum.tally.ayes, asset.precision);
  const naysBalance = formatBalance(referendum.tally.nays, asset.precision);
  const supportBalance = formatBalance(referendum.tally.support, asset.precision);

  return (
    <div className="flex flex-col items-start gap-3">
      <div className="flex gap-2 items-center w-full">
        <div className="w-1 h-3 rounded-[4px] bg-icon-positive" />
        <FootnoteText>{t('governance.referendum.aye')}</FootnoteText>
        <FootnoteText className="text-end grow">
          {t('governance.referendum.votes', { votes: ayeBalance.formatted })}
        </FootnoteText>
      </div>
      <div className="flex gap-2 items-center w-full">
        <div className="w-1 h-3 rounded-[4px] bg-icon-negative" />
        <FootnoteText>{t('governance.referendum.nay')}</FootnoteText>
        <FootnoteText className="text-end grow">
          {t('governance.referendum.votes', { votes: naysBalance.formatted })}
        </FootnoteText>
      </div>
      <div className="flex gap-2 items-center w-full">
        <div className="w-1 h-3 rounded-[4px] bg-icon-default" />
        <FootnoteText>{t('governance.referendum.support')}</FootnoteText>
        <FootnoteText className="text-end grow">
          {t('governance.referendum.votes', { votes: supportBalance.formatted })}
        </FootnoteText>
      </div>
    </div>
  );
};
