import { useI18n } from '@app/providers';
import { type Asset } from '@shared/core';
import { formatBalance, toNumberWithPrecision } from '@shared/lib/utils';
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

  const { ayes, nays, support } = referendum.tally;

  return (
    <div className="flex flex-col items-start gap-3">
      <div className="flex w-full items-center gap-2">
        <div className="h-3 w-1 rounded-[0.25em] bg-icon-positive" />
        <FootnoteText>{t('governance.referendum.aye')}</FootnoteText>
        <FootnoteText className="grow text-end">
          {t('governance.referendum.votes', {
            votes: formatBalance(ayes, asset.precision).formatted,
            count: toNumberWithPrecision(ayes, asset.precision),
          })}
        </FootnoteText>
      </div>
      <div className="flex w-full items-center gap-2">
        <div className="h-3 w-1 rounded-[4px] bg-icon-negative" />
        <FootnoteText>{t('governance.referendum.nay')}</FootnoteText>
        <FootnoteText className="grow text-end">
          {t('governance.referendum.votes', {
            votes: formatBalance(nays, asset.precision).formatted,
            count: toNumberWithPrecision(nays, asset.precision),
          })}
        </FootnoteText>
      </div>
      <div className="flex w-full items-center gap-2">
        <div className="h-3 w-1 rounded-[4px] bg-icon-default" />
        <FootnoteText>{t('governance.referendum.support')}</FootnoteText>
        <FootnoteText className="grow text-end">
          {t('governance.referendum.votes', {
            votes: formatBalance(support, asset.precision).formatted,
            count: toNumberWithPrecision(support, asset.precision),
          })}
        </FootnoteText>
      </div>
    </div>
  );
};
