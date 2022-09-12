import { useState } from 'react';
import cn from 'classnames';
import keyBy from 'lodash/keyBy';

import AssetBalance from '../AssetBalance/AssetBalance';
import { PublicKey } from '@renderer/domain/shared-kernel';
import { Asset } from '@renderer/domain/asset';
import { Chain } from '@renderer/domain/chain';
import { useBalance } from '@renderer/services/balance/balanceService';
import { total } from '@renderer/services/balance/common/utils';
import { ZERO_BALANCE } from '@renderer/services/balance/common/constants';
import { Button, Icon } from '@renderer/components/ui';

type Props = {
  hideZeroBalance?: boolean;
  searchSymbolOnly?: boolean;
  query?: string;
  chain: Chain;
  publicKey: PublicKey;
  canMakeActions?: boolean;
  onReceiveClick?: (asset: Asset) => void;
  onTransferClick?: () => void;
};

const NetworkBalances = ({
  query,
  hideZeroBalance,
  chain,
  publicKey,
  searchSymbolOnly,
  canMakeActions,
  onTransferClick,
  onReceiveClick,
}: Props) => {
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
    <li className="mb-5 rounded-2lg bg-white shadow-surface">
      <div
        className={cn(
          'flex items-center justify-between border-b bg-white sticky top-0 rounded-t-2lg',
          isHidden ? 'rounded-2lg border-white' : 'border-shade-5',
        )}
      >
        <div className="flex items-center">
          <h2
            className={cn(
              'flex items-center p-[15px] rounded-t-2lg border-shade-5 bg-white gap-x-2.5 sticky top-0 h-10',
              'text-xs font-bold text-neutral-variant uppercase',
              !isHidden && 'border-b',
            )}
          >
            <img src={chain.icon} width={20} height={20} alt="" />
            <p>{chain.name}</p>
          </h2>
          {balances?.some((b) => !b.verified) && (
            <div className="flex items-center gap-1 text-alert">
              <Icon name="shield" size={14} />
              <span className="uppercase text-2xs">verification failed</span>
            </div>
          )}
        </div>
        <div className="flex items-center">
          <Button pallet="shade" variant="text" className="max-h-5 px-0" onClick={() => setIsHidden(!isHidden)}>
            <Icon name={isHidden ? 'down' : 'up'} size={20} />
          </Button>
        </div>
      </div>
      {!isHidden && (
        <div className="flex flex-col divide-y divide-shade-5">
          {filteredAssets.map((asset) => (
            <AssetBalance
              key={asset.assetId}
              asset={asset}
              balance={balancesObject[asset.assetId.toString()]}
              canMakeActions={canMakeActions}
              onReceiveClick={() => onReceiveClick?.(asset)}
              onTransferClick={onTransferClick}
            />
          ))}
        </div>
      )}
    </li>
  );
};

export default NetworkBalances;
