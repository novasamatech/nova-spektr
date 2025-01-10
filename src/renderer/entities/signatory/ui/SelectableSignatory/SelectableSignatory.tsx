import { useUnit } from 'effector-react';

import { type Asset, type ChainId } from '@/shared/core';
import { cnTw, toAccountId, toAddress, transferableAmount } from '@/shared/lib/utils';
import { type AccountId } from '@/shared/polkadotjs-schemas';
import { BodyText, Icon } from '@/shared/ui';
import { AssetBalance } from '@/entities/asset';
import { useBalance } from '@/entities/balance';
import { WalletIcon, walletModel } from '@/entities/wallet';
// TODO: Fix layers

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

  if (!signatoryWallet) {
    return null;
  }

  return (
    <button
      className="group flex w-full cursor-pointer items-center rounded px-2 py-1.5 text-text-secondary hover:bg-action-background-hover hover:text-text-primary"
      onClick={() => onSelected(value)}
    >
      <WalletIcon type={signatoryWallet.type} />
      <BodyText className="ml-2 text-inherit">{signatoryWallet.name}</BodyText>
      {balance && asset && (
        <AssetBalance
          value={transferableAmount(balance)}
          asset={asset}
          className="ml-auto mr-6 text-body text-inherit"
        />
      )}
      <Icon name="right" className={cnTw('group-hover:text-icon-active', !balance && 'ml-auto')} size={16} />
    </button>
  );
};
