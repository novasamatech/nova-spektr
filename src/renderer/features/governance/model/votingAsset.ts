import { combine } from 'effector';

import { networkSelectorModel } from './networkSelector';

const $votingAssets = networkSelectorModel.$governanceChains.map((chains) => {
  return Object.fromEntries(chains.map((chain) => [chain.chainId, chain.assets.at(0) ?? null]));
});

const $votingAsset = combine(
  {
    assets: $votingAssets,
    chainId: networkSelectorModel.$governanceChainId,
  },
  ({ assets, chainId }) => {
    if (!chainId) return null;

    return assets[chainId] ?? null;
  },
);

/**
 * @deprecated Use `networkSelectorModel.$network` instead
 */
export const votingAssetModel = {
  $votingAssets,
  $votingAsset,
};
