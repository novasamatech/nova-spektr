import { attach, combine, sample } from 'effector';

import { series } from '@/shared/effector';
import { attachToFeatureInput } from '@/shared/feature';
import { type RfcProposal, referendumService, rfc } from '@/domains/collectives';

import { fellowshipTasksFeature } from './feature';
import { fellowship } from './fellowship';
import { referendums } from './referendums';

const $rfcSummary = fellowship.$store.map(s => s?.rfcSummary ?? null);

const requestRfcFx = attach({ effect: rfc.rfcSummaryResource.fetch });

const $rfcReferendums = combine({ referendums: referendums.$ongoing }, ({ referendums }) => {
  return referendums.filter(referendum => {
    return referendum.proposal && referendumService.isRfcProposal(referendum.proposal);
  });
});

sample({
  clock: attachToFeatureInput(fellowshipTasksFeature, $rfcReferendums),
  fn({ input, data: rfcReferendums }) {
    return rfcReferendums.map(r => ({
      palletType: input.palletType,
      prNumber: (r.proposal as RfcProposal).pullRequest,
      chainId: input.chainId,
    }));
  },
  target: series(requestRfcFx, { parallel: true, skipErrors: true }),
});

export const rfcModel = {
  $rfcSummary,
  $isPending: rfc.rfcSummaryResource.$pending,

  requestRfcSummary: requestRfcFx,
};
