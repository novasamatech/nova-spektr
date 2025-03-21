import { BN_MILLION } from '@polkadot/util';
import { useGate, useStoreMap } from 'effector-react';
import { memo } from 'react';

import { useI18n } from '@/shared/i18n';
import { nullable } from '@/shared/lib/utils';
import { HelpText } from '@/shared/ui';
import { DynamicVoteChart, VoteChart } from '@/shared/ui-entities';
import { Box, Skeleton, Tooltip } from '@/shared/ui-kit';
import { type Referendum, referendumService } from '@/domains/collectives';
import { fellowshipReferendumsDetailsFeature } from '../../model/feature';
import { thresholdsModel } from '../../model/thresholds';

type Props = {
  referendum: Referendum | null;
  pending: boolean;
  descriptionPosition: 'tooltip' | 'bottom';
  votes?: number | null;
  highlight?: 'aye' | 'nay' | null;
};

export const ReferendumVoteChart = memo<Props>(({ referendum, pending, descriptionPosition, votes, highlight }) => {
  useGate(fellowshipReferendumsDetailsFeature.gate);

  const { t } = useI18n();

  const thresholds = useStoreMap({
    store: thresholdsModel.$thresholds,
    keys: [referendum?.id],
    fn: (thresholds, [id]) => (id ? (thresholds[id] ?? null) : null),
  });

  if (nullable(referendum)) {
    if (pending) {
      return (
        <Skeleton active fullWidth>
          <VoteChart value={0} disabled />
        </Skeleton>
      );
    } else {
      return null;
    }
  }

  if (nullable(thresholds) || referendumService.isCompleted(referendum)) {
    return null;
  }

  const total = referendum.tally.ayes + referendum.tally.nays;
  const aye = (referendum.tally.ayes * 100_000) / total / 1000;
  const nay = (referendum.tally.nays * 100_000) / total / 1000;
  const votesImpact = votes && highlight ? (votes * 100_000) / total / 1000 : 0;
  const threshold = thresholds.approval.threshold.div(BN_MILLION).toNumber() / 10;
  const disabled = referendum.tally.ayes === 0 && referendum.tally.nays === 0;

  const chartNode = (
    <DynamicVoteChart value={aye} disabled={disabled} votesImpact={highlight === 'nay' ? -votesImpact : votesImpact} />
  );

  if (descriptionPosition === 'tooltip') {
    return (
      <Tooltip side="top">
        <Tooltip.Trigger>
          <div>{chartNode}</div>
        </Tooltip.Trigger>
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
      <div className="flex w-full flex-col">
        {chartNode}
        <Box direction="row" horizontalAlign="space-between">
          <HelpText className="text-text-secondary">
            {t('voteChart.aye')}: {referendum.tally.ayes}
          </HelpText>
          <HelpText className="text-text-secondary">
            {t('voteChart.nay')}: {referendum.tally.nays}
          </HelpText>
        </Box>
      </div>
    );
  }

  return chartNode;
});
