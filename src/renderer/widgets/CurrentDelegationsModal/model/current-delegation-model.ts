import { BN } from '@polkadot/util';
import { combine, createEvent, createStore, restore, sample } from 'effector';
import { combineEvents, readonly } from 'patronum';

import { type DelegateAccount } from '@/shared/api/governance';
import { includesMultiple, nonNullable, toAddress } from '@/shared/lib/utils';
import { type AccountId } from '@/shared/polkadotjs-schemas';
import { votingService } from '@/entities/governance';
import { delegateRegistryAggregate, networkSelectorModel, votingAggregate } from '@/features/governance';
import { navigationModel } from '@/features/navigation';
import { submitModel } from '@/features/operations/OperationSubmit';
import { delegateModel } from '@/widgets/DelegateModal';
import { SortProp, SortType } from '@/widgets/DelegationModal';

const flowFinished = createEvent();
const flowStarted = createEvent();
const queryChanged = createEvent<string>();
const selectDelegate = createEvent<DelegateAccount>();

const $query = restore(queryChanged, '');
const $isOpen = createStore(false);

const $delegateList = combine(
  {
    list: delegateRegistryAggregate.$delegateRegistry,
    activeVotes: votingAggregate.$activeWalletVotes,
    chain: networkSelectorModel.$governanceChain,
    query: $query,
  },
  ({ list, activeVotes, query, chain }) => {
    const activeDelegationsSet = new Set<AccountId>();

    for (const voteList of Object.values(activeVotes)) {
      for (const vote of Object.values(voteList)) {
        if (votingService.isDelegating(vote)) {
          activeDelegationsSet.add(vote.target);
        }
      }
    }

    const delegatedList = list.filter((delegate) => activeDelegationsSet.has(delegate.accountId));

    const searched = query
      ? delegatedList.filter((delegate) =>
          includesMultiple(
            [toAddress(delegate.accountId, { prefix: chain?.addressPrefix }), delegate.name, delegate.shortDescription],
            query,
          ),
        )
      : delegatedList;

    const sortProp = SortProp[SortType.DELEGATIONS];

    return searched.sort((a, b) => (new BN(a[sortProp] || 0).lt(new BN(b[sortProp] || 0)) ? 1 : -1));
  },
);

sample({
  clock: combineEvents({
    events: [delegateModel.output.flowFinished, submitModel.output.formSubmitted],
    reset: flowStarted,
  }),
  source: $delegateList,
  filter: nonNullable,
  target: flowStarted,
});

sample({
  clock: flowStarted,
  source: networkSelectorModel.$governanceChain,
  filter: nonNullable,
  target: delegateRegistryAggregate.events.requestDelegateRegistry,
});

sample({
  clock: flowStarted,
  fn: () => true,
  target: $isOpen,
});

sample({
  clock: flowFinished,
  fn: () => false,
  target: $isOpen,
});

sample({
  clock: selectDelegate,
  target: delegateModel.events.flowStarted,
});

sample({
  clock: navigationModel.events.navigateTo,
  target: flowFinished,
});

export const currentDelegationModel = {
  $isListLoading: delegateRegistryAggregate.$isRegistryLoading,
  $delegateList: readonly($delegateList),
  $query: readonly($query),
  $isOpen,

  events: {
    flowStarted,
    queryChanged,
    selectDelegate,
  },

  output: {
    flowFinished,
  },
};
