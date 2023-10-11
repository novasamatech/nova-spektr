import { useUnit } from 'effector-react';

import { WalletIcon, walletModel } from '@renderer/entities/wallet';
import { Icon } from '@renderer/shared/ui';
import { cnTw, toAccountId, toAddress, transferableAmount } from '@renderer/shared/lib/utils';
import { AssetBalance, useBalance } from '@renderer/entities/asset';
import type { AccountId, Asset, ChainId } from '@renderer/shared/core';
import { Body } from '@renderer/shared/ui/Typography/Typography.stories';

type Props<T extends any> = {
  value: T;
  asset: Asset;
  accountId: AccountId;
  addressPrefix: number;
  chainId: ChainId;
  walletId: number;
  onSelected: (value: T) => void;
};

export const SelectableSignatory = <T extends any>({
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

  if (!signatoryWallet) return <></>;

  const address = toAddress(accountId, { prefix: addressPrefix });

  const { getLiveBalance } = useBalance();
  const balance = getLiveBalance(toAccountId(address), chainId, asset.assetId.toString());

  return (
    <button
      className="group flex items-center cursor-pointer hover:bg-action-background-hover px-2 py-1.5 rounded w-full text-text-secondary hover:text-text-primary"
      onClick={() => onSelected(value)}
    >
      <WalletIcon type={signatoryWallet.type} />
      <Body className="ml-2 text-inherit">{signatoryWallet.name}</Body>
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
