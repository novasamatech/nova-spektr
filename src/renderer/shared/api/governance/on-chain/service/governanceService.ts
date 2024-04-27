import { ApiPromise } from '@polkadot/api';
import { BN_ZERO } from '@polkadot/util';

import { OngoingReferendum, RejectedReferendum, ApprovedReferendum, ReferendumType } from '@shared/core';

export const governanceService = {
  getReferendums,
};

type ReferendumsResult = {
  ongoing: OngoingReferendum[];
  rejected: RejectedReferendum[];
  approved: ApprovedReferendum[];
};
async function getReferendums(api: ApiPromise): Promise<ReferendumsResult> {
  const referendums = await api.query.referenda.referendumInfoFor.entries();

  try {
    return referendums.reduce<ReferendumsResult>(
      (acc, [index, option]) => {
        if (option.isNone) return acc;
        const referendum = option.unwrap();

        if (referendum.isRejected) {
          const rejected = referendum.asRejected;

          acc.rejected.push({
            index: index.args[0].toString(),
            blockHeight: rejected[0].toNumber(),
            type: ReferendumType.Rejected,
            decisionDeposit: null,
            submissionDeposit: rejected[1].isSome
              ? {
                  who: rejected[1].unwrap().who.toString(),
                  amount: rejected[1].unwrap().amount.toBn(),
                }
              : null,
          } as RejectedReferendum);
        }

        if (referendum.isApproved) {
          const approved = referendum.asApproved;

          acc.approved.push({
            index: index.args[0].toString(),
            blockHeight: approved[0].toNumber(),
            type: ReferendumType.Approved,
            decisionDeposit: null,
            submissionDeposit: approved[1].isSome
              ? {
                  who: approved[1].unwrap().who.toString(),
                  amount: approved[1].unwrap().amount.toBn(),
                }
              : null,
          } as ApprovedReferendum);
        }

        if (referendum.isOngoing) {
          const ongoing = referendum.asOngoing;
          // readonly origin: KitchensinkRuntimeOriginCaller;
          // readonly proposal: FrameSupportPreimagesBounded;
          // readonly inQueue: bool;
          // readonly alarm: Option<ITuple<[u32, ITuple<[u32, u32]>]>>;

          acc.ongoing.push({
            index: index.args[0].toString(),
            enactment: ongoing.enactment.asAfter.toNumber(),
            blockHeight: ongoing.submitted.toNumber(),
            track: ongoing.track.toNumber(),
            deciding: ongoing.deciding.isSome
              ? {
                  since: ongoing.deciding.unwrap().since.toNumber(),
                  confirming: ongoing.deciding.unwrap().confirming.unwrapOr(BN_ZERO).toNumber(),
                }
              : null,
            tally: {
              ayes: ongoing.tally.ayes.toBn(),
              nays: ongoing.tally.nays.toBn(),
              support: ongoing.tally.support.toBn(),
            },
            decisionDeposit: ongoing.decisionDeposit.isSome
              ? {
                  who: ongoing.decisionDeposit.unwrap().who.toString(),
                  amount: ongoing.decisionDeposit.unwrap().amount.toBn(),
                }
              : null,
            submissionDeposit: {
              who: ongoing.submissionDeposit.who.toString(),
              amount: ongoing.submissionDeposit.amount.toBn(),
            },
            type: ReferendumType.Ongoing,
          } as OngoingReferendum);
        }

        return acc;
      },
      { ongoing: [], rejected: [], approved: [] },
    );
  } catch (e) {
    console.log(e);

    return { ongoing: [], rejected: [], approved: [] };
  }
}
