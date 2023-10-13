import { useUnit } from 'effector-react';

import { WalletIcon, walletModel } from '@renderer/entities/wallet';
import { BodyText, Icon } from '@renderer/shared/ui';
import { cnTw, toAccountId, toAddress, transferableAmount } from '@renderer/shared/lib/utils';
import { AssetBalance, useBalance } from '@renderer/entities/asset';
import type { AccountId, Asset, ChainId } from '@renderer/shared/core';
import { WalletType } from '@renderer/shared/core';

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

  const address = toAddress(accountId, { prefix: addressPrefix });

  const { getLiveBalance } = useBalance();
  const balance = getLiveBalance(toAccountId(address), chainId, asset.assetId.toString());

  if (!signatoryWallet) return <></>;

  // TODO remove after PR merged https://github.com/novasamatech/nova-spektr/pull/1143
  // support for legacy signatory as shard from multishard account
  const walletType =
    signatoryWallet.type === WalletType.MULTISHARD_PARITY_SIGNER
      ? WalletType.SINGLE_PARITY_SIGNER
      : signatoryWallet.type;

  return (
    <button
      className="group flex items-center cursor-pointer hover:bg-action-background-hover px-2 py-1.5 rounded w-full text-text-secondary hover:text-text-primary"
      onClick={() => onSelected(value)}
    >
      <WalletIcon type={walletType} />
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
