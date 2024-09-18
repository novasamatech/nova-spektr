import { BN_MILLION } from '@polkadot/util';
import { useStoreMap } from 'effector-react';
import { memo } from 'react';

import { nullable } from '@shared/lib/utils';
import { VoteChart } from '@shared/ui-entities';
import { type Referendum, collectiveDomain } from '@/domains/collectives';
import { thresholdsModel } from '../../model/thresholds';

type Props = {
  referendum: Referendum;
};

export const ReferendumVoteChart = memo<Props>(({ referendum }) => {
  const thresholds = useStoreMap({
    store: thresholdsModel.$thresholds,
    keys: [referendum.id],
    fn: (thresholds, [id]) => thresholds[id] ?? null,
  });

  if (collectiveDomain.referendum.service.isCompleted(referendum) || nullable(thresholds)) {
    return null;
  }

  const perbillMultiplier = BN_MILLION.muln(10);

  const value = thresholds.approval.value.div(perbillMultiplier).toNumber();
  const threshold = thresholds.approval.threshold.div(perbillMultiplier).toNumber();
  const disabled = referendum.tally.ayes === 0 && referendum.tally.nays === 0;

  return <VoteChart value={value} threshold={threshold} disabled={disabled} />;
});
