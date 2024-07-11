import { FC } from 'react';

import { FootnoteText } from '@shared/ui';
import { referendumService } from '@entities/governance';
import { useI18n } from '@app/providers';
import { AggregatedReferendum } from '../../types/structs';
import { formatBalance } from '@shared/lib/utils';
import { Asset } from '@shared/core';

type Props = {
  item: AggregatedReferendum;
  asset: Asset;
};

export const VotingSummary: FC<Props> = ({ item, asset }: Props) => {
  const { t } = useI18n();
  const { referendum } = item;

  if (!referendumService.isOngoing(referendum)) {
    return null;
  }

  const ayeBalance = formatBalance(referendum.tally.ayes.toString(), asset.precision);
  const naysBalance = formatBalance(referendum.tally.nays.toString(), asset.precision);
  const supportBalance = formatBalance(referendum.tally.support.toString(), asset.precision);

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
