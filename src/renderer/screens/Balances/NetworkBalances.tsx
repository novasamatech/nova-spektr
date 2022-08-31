import sortBy from 'lodash/sortBy';
import keyBy from 'lodash/keyBy';

import AssetBalance from './AssetBalance';
import { PublicKey } from '@renderer/domain/shared-kernel';
import { Chain } from '@renderer/services/network/common/types';
import { useBalance } from '@renderer/services/balance/balanceService';
import { total } from '@renderer/services/balance/common/utils';
import { ZERO_BALANCE } from '@renderer/services/balance/common/constants';

type Props = {
  hideZeroBalances: boolean;
  query: string;
  chain: Chain;
  publicKey?: PublicKey;
};

const NetworkBalances = ({ query, hideZeroBalances, chain, publicKey }: Props) => {
  if (!publicKey) {
    return null;
  }

  const { getLiveNetworkBalances } = useBalance();

  const balances = getLiveNetworkBalances(publicKey, chain.chainId);
  const balancesObject = keyBy(balances, 'assetId');

  if (
    query &&
    !chain.name.toLowerCase().includes(query) &&
    !chain.assets.some((asset) => asset.name.toLowerCase().includes(query))
  ) {
    return null;
  }

  const filteredAssets = chain.assets.filter((asset) => {
    if (!query && hideZeroBalances && total(balancesObject[asset.assetId]) === ZERO_BALANCE) {
      return false;
    }

    if (query && (!asset.name.toLowerCase().includes(query) || !asset.symbol.toLowerCase().includes(query))) {
      return false;
    }

    return true;
  });

  if (filteredAssets.length === 0) {
    return null;
  }

  return (
    <div key={chain.chainId} className="mb-5 rounded-2lg bg-white shadow-surface">
      <h2 className="flex items-center p-[15px] border-b rounded-t-2lg border-shade-5 bg-white gap-x-2.5 sticky top-0 h-10 text-sm font-bold text-neutral-variant uppercase">
        <img src={chain.icon} className="w-5 h-5" alt="" />
        <p>{chain.name}</p>
      </h2>
      <div className="flex flex-col divide-y divide-shade-5">
        {filteredAssets.map((asset) => (
          <AssetBalance key={asset.assetId} asset={asset} balance={balancesObject[asset.assetId.toString()]} />
        ))}
      </div>
    </div>
  );
};

export default NetworkBalances;
