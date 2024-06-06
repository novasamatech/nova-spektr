import { combine, createEvent, createStore, restore, sample } from 'effector';

import { includes } from '@shared/lib/utils';
import { AssetByChains } from '@shared/core';
import { portfolioModel } from '@features/assets';
import { ModalType, Step } from '../lib/types';

const flowClosed = createEvent();

const stepChanged = createEvent<Step>();
const modalTypeChanged = createEvent<ModalType>();
const queryChanged = createEvent<string>();

const $selectedAsset = createStore<AssetByChains | null>(null).reset(flowClosed);
const $modalType = restore<ModalType | null>(modalTypeChanged, null).reset(flowClosed);
const $step = restore<Step>(stepChanged, Step.NONE).reset(flowClosed);
const $query = restore<string>(queryChanged, '').reset(flowClosed);

const $assetWithChains = combine(
  {
    selectedAsset: $selectedAsset,
    query: $query,
  },
  ({ selectedAsset, query }) => {
    if (!query || !selectedAsset) return selectedAsset;

    const filteredChains = selectedAsset.chains.filter((chain) => {
      const hasSymbol = includes(chain.assetSymbol, query);
      const hasChainName = includes(chain.name, query);

      return hasSymbol || hasChainName;
    });

    return { ...selectedAsset, chains: filteredChains };
  },
  { skipVoid: false },
);

sample({
  clock: portfolioModel.events.transferStarted,
  fn: () => ModalType.TRANSFER,
  target: modalTypeChanged,
});

sample({
  clock: portfolioModel.events.receiveStarted,
  fn: () => ModalType.RECEIVE,
  target: modalTypeChanged,
});

sample({
  clock: [portfolioModel.events.transferStarted, portfolioModel.events.receiveStarted],
  fn: () => Step.INIT,
  target: stepChanged,
});

sample({
  clock: [portfolioModel.events.transferStarted, portfolioModel.events.receiveStarted],
  target: $selectedAsset,
});

sample({
  clock: flowClosed,
  fn: () => Step.NONE,
  target: stepChanged,
});

export const assetTransactionModel = {
  $assetWithChains,
  $modalType,
  $step,
  $query,
  events: {
    queryChanged,
  },
  output: {
    flowClosed,
  },
};
