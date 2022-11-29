import cn from 'classnames';
import { useState } from 'react';
import { BN } from '@polkadot/util';

import { Button, Icon } from '@renderer/components/ui';
import { Asset } from '@renderer/domain/asset';
import { Chain } from '@renderer/domain/chain';
import { PublicKey } from '@renderer/domain/shared-kernel';
import { useBalance } from '@renderer/services/balance/balanceService';
import { ZERO_BALANCE } from '@renderer/services/balance/common/constants';
import { total } from '@renderer/services/balance/common/utils';
import { ExtendedChain } from '@renderer/services/network/common/types';
import AssetBalance from '../AssetBalance/AssetBalance';
import { useI18n } from '@renderer/context/I18nContext';
import { Balance } from '@renderer/domain/balance';

type Props = {
  hideZeroBalance?: boolean;
  searchSymbolOnly?: boolean;
  query?: string;
  chain: Chain | ExtendedChain;
  publicKeys: PublicKey[];
  canMakeActions?: boolean;
  onReceiveClick?: (asset: Asset) => void;
};

const sumBalances = (firstBalance: Balance, secondBalance?: Balance): Balance => {
  if (!secondBalance) return firstBalance;

  return {
    ...firstBalance,
    verified: firstBalance.verified && secondBalance.verified,
    free: new BN(firstBalance.free || 0).add(new BN(secondBalance.free || 0)).toString(),
    reserved: new BN(firstBalance.reserved || 0).add(new BN(secondBalance.reserved || 0)).toString(),
    frozen: new BN(firstBalance.frozen || 0).add(new BN(secondBalance.frozen || 0)).toString(),
    locked: (firstBalance.locked || []).concat(secondBalance.locked || []),
  };
};

const NetworkBalances = ({
  query,
  hideZeroBalance,
  chain,
  publicKeys,
  searchSymbolOnly,
  canMakeActions,
  onReceiveClick,
}: Props) => {
  const [isHidden, setIsHidden] = useState(false);

  const { t } = useI18n();

  const { getLiveNetworkBalances } = useBalance();

  const balances = getLiveNetworkBalances(publicKeys, chain.chainId);

  const balancesObject =
    balances?.reduce((result, balance) => {
      return {
        ...result,
        [balance.assetId]: sumBalances(balance, result[balance.assetId]),
      };
    }, {} as Record<string, Balance>) || {};

  const filteredAssets = chain.assets.filter((asset) => {
    if (query) {
      const hasMatch = (name: string) => name.toLowerCase().includes(query);

      return hasMatch(asset.symbol) || (!searchSymbolOnly && (hasMatch(chain.name) || hasMatch(asset.name)));
    }

    const balance = balancesObject[asset.assetId];

    return !hideZeroBalance || !balance || balance.verified !== true || (balance && total(balance) !== ZERO_BALANCE);
  });

  if (filteredAssets.length === 0) {
    return null;
  }

  const hasFailedVerification = balances?.some((b) => !b.verified);

  return (
    <li className="mb-5 rounded-2lg bg-white shadow-surface">
      <div
        className={cn(
          'flex items-center justify-between border-b bg-white sticky top-0 z-10 rounded-t-2lg py-2.5 px-4',
          isHidden ? 'rounded-2lg border-white' : 'border-shade-5',
        )}
      >
        <div className="flex items-center gap-x-2.5">
          <h2 className="flex items-center bg-white gap-x-2.5 text-neutral-variant">
            <img src={chain.icon} width={20} height={20} alt="" />
            <p className="text-sm font-bold uppercase">{chain.name}</p>
          </h2>
          {hasFailedVerification && (
            <div className="flex items-center gap-x-1 text-alert">
              <Icon name="shield" size={14} />
              <p className="uppercase text-2xs leading-[15px]">{t('balances.verificationFailedLabel')}</p>
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
              chainId={chain.chainId}
              asset={asset}
              balance={balancesObject[asset.assetId.toString()]}
              canMakeActions={canMakeActions}
              onReceiveClick={() => onReceiveClick?.(asset)}
            />
          ))}
        </div>
      )}
    </li>
  );
};

export default NetworkBalances;
