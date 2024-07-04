import { combine } from 'effector';
import { or, inFlight, not } from 'patronum';

import { approveThresholdModel, supportThresholdModel, votingModel } from '@entities/governance';
import { networkSelectorModel } from '../../../model/network-selector-model';
import { referendumModel } from '../../../model/referendum-model';
import { titleModel } from '../../../model/title-model';

const $referendumTitles = combine(
  {
    titles: titleModel.$titles,
    chain: networkSelectorModel.$governanceChain,
  },
  ({ titles, chain }) => (chain ? titles[chain.chainId] ?? {} : {}),
);

export const referendumListModel = {
  $referendumTitles,
  $isLoading: or(
    not(networkSelectorModel.$isConnectionActive),
    inFlight([
      referendumModel.effects.requestReferendumsFx,
      approveThresholdModel.effects.requestApproveThresholdsFx,
      supportThresholdModel.effects.requestSupportThresholdsFx,
      votingModel.effects.requestVotingFx,
    ]),
  ),
};
