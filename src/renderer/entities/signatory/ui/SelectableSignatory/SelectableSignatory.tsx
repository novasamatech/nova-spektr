import { useUnit } from 'effector-react';

import { WalletIcon, walletModel } from '@entities/wallet';
import { BodyText, Icon } from '@shared/ui';
import { cnTw, toAccountId, toAddress, transferableAmount } from '@shared/lib/utils';
import type { AccountId, Asset, ChainId } from '@shared/core';
// TODO: Fix layers
import { AssetBalance } from '@entities/asset';
import { useBalance } from '@entities/balance';

type Props<T> = {
  value: T;
  asset: Asset;
  accountId: AccountId;
  addressPrefix: number;
  chainId: ChainId;
  walletId: number;
  onSelected: (value: T) => void;
};

export const SelectableSignatory = <T,>({
  value,
  asset,
  accountId,
  addressPrefix,
  chainId,
  walletId,
  onSelected,
}: Props<T>) => {
  const wallets = useUnit(walletModel.$wallets);
  const signatoryWallet = wallets.find((w) => w.id === walletId);

  const address = toAddress(accountId, { prefix: addressPrefix });

  const balance = useBalance({
    accountId: toAccountId(address),
    chainId,
    assetId: asset.assetId.toString(),
  });

  if (!signatoryWallet) return null;

  return (
    <button
      className="group flex items-center cursor-pointer hover:bg-action-background-hover px-2 py-1.5 rounded w-full text-text-secondary hover:text-text-primary"
      onClick={() => onSelected(value)}
    >
      <WalletIcon type={signatoryWallet.type} />
      <BodyText className="ml-2 text-inherit">{signatoryWallet.name}</BodyText>
      {balance && asset && (
        <AssetBalance
          value={transferableAmount(balance)}
          asset={asset}
          className="text-body text-inherit ml-auto mr-6"
        />
      )}
      <Icon name="right" className={cnTw('group-hover:text-icon-active', !balance && 'ml-auto')} size={16} />
    </button>
  );
};
