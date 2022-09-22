import cn from 'classnames';
import keyBy from 'lodash/keyBy';
import { useState } from 'react';

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

type Props = {
  hideZeroBalance?: boolean;
  searchSymbolOnly?: boolean;
  query?: string;
  chain: Chain | ExtendedChain;
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

  const { t } = useI18n();

  const { getLiveNetworkBalances } = useBalance();

  const balances = getLiveNetworkBalances(publicKey, chain.chainId);
  const balancesObject = keyBy(balances, 'assetId');

  const filteredAssets = chain.assets.filter((asset) => {
    if (query) {
      const hasMatch = (name: string) => name.toLowerCase().includes(query);

      return hasMatch(asset.symbol) || (!searchSymbolOnly && (hasMatch(chain.name) || hasMatch(asset.name)));
    }

    const balance = balancesObject[asset.assetId];

    return !hideZeroBalance || (balance && total(balance) !== ZERO_BALANCE);
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
              <p className="uppercase text-2xs leading-[15px]">{t("balances.verificationFailedLabel")}</p>
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
