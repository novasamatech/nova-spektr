import { networkSelectorModel } from './network-selector-model';

export const $votingAssets = networkSelectorModel.$governanceChains.map((chains) => {
  return Object.fromEntries(chains.map((chain) => [chain.chainId, chain.assets.at(0) ?? null]));
});

export const votingAssetsModel = {
  $votingAssets,
};
