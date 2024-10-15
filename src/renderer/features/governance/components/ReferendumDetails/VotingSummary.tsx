import { useGate, useStoreMap } from 'effector-react';

import { type Asset, type Chain } from '@/shared/core';
import { useI18n } from '@/shared/i18n';
import { formatAsset } from '@/shared/lib/utils';
import { FootnoteText } from '@/shared/ui';
import { votingSummaryModel } from '../../model/votingSummary';
import { type AggregatedReferendum } from '../../types/structs';

type Props = {
  referendum: AggregatedReferendum;
  chain: Chain;
  asset: Asset;
};

export const VotingSummary = ({ referendum, chain, asset }: Props) => {
  useGate(votingSummaryModel.gates.flow, { referendum, chain });

  const { t } = useI18n();

  const votingSummary = useStoreMap({
    store: votingSummaryModel.$votingSummary,
    keys: [chain.chainId, referendum.referendumId],
    fn: (summary, [chain, referendum]) => summary[chain]?.[referendum] ?? null,
  });

  if (!votingSummary) {
    return null;
  }

  return (
    <div className="flex flex-col items-start gap-3">
      <div className="flex w-full items-center gap-2">
        <div className="h-3 w-1 rounded-[0.25em] bg-icon-positive" />
        <FootnoteText>{t('governance.referendum.aye')}</FootnoteText>
        <FootnoteText className="grow text-end">{formatAsset(votingSummary.ayes, asset)}</FootnoteText>
      </div>
      <div className="flex w-full items-center gap-2">
        <div className="h-3 w-1 rounded-[4px] bg-icon-negative" />
        <FootnoteText>{t('governance.referendum.nay')}</FootnoteText>
        <FootnoteText className="grow text-end">{formatAsset(votingSummary.nays, asset)}</FootnoteText>
      </div>
      <div className="flex w-full items-center gap-2">
        <div className="h-3 w-1 rounded-[4px] bg-icon-default" />
        <FootnoteText>{t('governance.referendum.support')}</FootnoteText>
        <FootnoteText className="grow text-end">{formatAsset(votingSummary.support, asset)}</FootnoteText>
      </div>
    </div>
  );
};
