import { BN_BILLION, BN_MILLION } from '@polkadot/util';
import { useStoreMap } from 'effector-react';
import { memo } from 'react';

import { useI18n } from '@app/providers';
import { Tooltip } from '@/shared/ui-kit';
import { nullable } from '@shared/lib/utils';
import { FootnoteText } from '@shared/ui';
import { VoteChart } from '@shared/ui-entities';
import { type Referendum, collectiveDomain } from '@/domains/collectives';
import { thresholdsModel } from '../../model/thresholds';

type Props = {
  referendum: Referendum;
  descriptionPosition: 'tooltip' | 'bottom';
};

export const ReferendumVoteChart = memo<Props>(({ referendum, descriptionPosition }) => {
  const { t } = useI18n();

  const thresholds = useStoreMap({
    store: thresholdsModel.$thresholds,
    keys: [referendum.id],
    fn: (thresholds, [id]) => thresholds[id] ?? null,
  });

  if (collectiveDomain.referendum.service.isCompleted(referendum) || nullable(thresholds)) {
    return null;
  }

  const perbillMultiplier = BN_MILLION.muln(10);

  const aye = thresholds.approval.value.div(perbillMultiplier).toNumber();
  const nay = BN_BILLION.sub(thresholds.approval.value).div(perbillMultiplier).toNumber();
  const threshold = thresholds.approval.threshold.div(perbillMultiplier).toNumber();
  const disabled = referendum.tally.ayes === 0 && referendum.tally.nays === 0;

  const chartNode = (
    <div>
      <VoteChart value={aye} threshold={threshold} disabled={disabled} />
    </div>
  );

  if (descriptionPosition === 'tooltip') {
    return (
      <Tooltip side="top">
        <Tooltip.Trigger>{chartNode}</Tooltip.Trigger>
        <Tooltip.Content>
          <span className="text-inherit">{`${t('voteChart.toPass')} ${threshold.toFixed(2)}%`}</span>
          <br />
          <span className="text-inherit">{`${t('voteChart.aye')} ${aye.toFixed(2)}%`}</span>
          <br />
          <span className="text-inherit">{`${t('voteChart.nay')} ${nay.toFixed(2)}%`}</span>
        </Tooltip.Content>
      </Tooltip>
    );
  }

  if (descriptionPosition === 'bottom') {
    return (
      <div className="flex w-full flex-col gap-1">
        {chartNode}
        <div className="flex justify-between">
          <div className="flex flex-col items-start">
            <FootnoteText>{aye.toFixed(2)}%</FootnoteText>
            <FootnoteText className="text-text-secondary">{t('voteChart.aye')}</FootnoteText>
          </div>
          <div className="flex flex-col items-center">
            <FootnoteText>{threshold.toFixed(2)}%</FootnoteText>
            <FootnoteText className="text-text-secondary">{t('voteChart.toPass')}</FootnoteText>
          </div>
          <div className="flex flex-col items-end">
            <FootnoteText>{nay.toFixed(2)}%</FootnoteText>
            <FootnoteText className="text-text-secondary">{t('voteChart.nay')}</FootnoteText>
          </div>
        </div>
      </div>
    );
  }

  return chartNode;
});
