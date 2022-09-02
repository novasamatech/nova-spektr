import { useState } from 'react';
import cn from 'classnames';
import keyBy from 'lodash/keyBy';

import AssetBalance from './AssetBalance';
import { PublicKey } from '@renderer/domain/shared-kernel';
import { Chain } from '@renderer/services/network/common/types';
import { useBalance } from '@renderer/services/balance/balanceService';
import { total } from '@renderer/services/balance/common/utils';
import { ZERO_BALANCE } from '@renderer/services/balance/common/constants';
import { Icon } from '@renderer/components/ui';

type Props = {
  hideZeroBalance: boolean;
  searchSymbolOnly?: boolean;
  query?: string;
  chain: Chain;
  publicKey: PublicKey;
};

const NetworkBalances = ({ query, hideZeroBalance, chain, publicKey, searchSymbolOnly }: Props) => {
  const [isHidden, setIsHidden] = useState(false);

  const { getLiveNetworkBalances } = useBalance();

  const balances = getLiveNetworkBalances(publicKey, chain.chainId);
  const balancesObject = keyBy(balances, 'assetId');

  const filteredAssets = chain.assets.filter((asset) => {
    if (query) {
      return (
        (!searchSymbolOnly && (chain.name.toLowerCase().includes(query) || asset.name.toLowerCase().includes(query))) ||
        asset.symbol.toLowerCase().includes(query)
      );
    }

    return !(
      hideZeroBalance &&
      (!balancesObject[asset.assetId] || total(balancesObject[asset.assetId]) === ZERO_BALANCE)
    );
  });

  if (filteredAssets.length === 0) {
    return null;
  }

  return (
    <div key={chain.chainId} className="mb-5 rounded-2lg bg-white shadow-surface">
      <div
        className={cn(
          'flex items-center justify-between bg-white sticky top-0 rounded-t-2lg',
          isHidden && 'rounded-2lg',
        )}
      >
        <h2
          className={cn(
            'flex items-center p-[15px] rounded-t-2lg border-shade-5 bg-white gap-x-2.5 sticky top-0 h-10',
            'text-sm font-bold text-neutral-variant uppercase',
            !isHidden && 'border-b',
          )}
        >
          <img src={chain.icon} className="w-5 h-5" alt="" />
          <p>{chain.name}</p>
        </h2>
        <div className="flex items-center">
          <button className="bg-white border-0 mr-4" onClick={() => setIsHidden(!isHidden)}>
            <Icon name={isHidden ? 'down' : 'up'} className="w-5 h-5" />
          </button>
        </div>
      </div>
      {!isHidden && (
        <div className="flex flex-col divide-y divide-shade-5">
          {filteredAssets.map((asset) => (
            <AssetBalance key={asset.assetId} asset={asset} balance={balancesObject[asset.assetId.toString()]} />
          ))}
        </div>
      )}
    </div>
  );
};

export default NetworkBalances;
