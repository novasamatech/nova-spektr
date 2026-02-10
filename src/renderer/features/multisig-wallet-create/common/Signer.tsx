import { BN_ZERO } from '@polkadot/util';
import { type FormEvent } from 'react';

import { type Chain, type Wallet } from '@/shared/core';
import { getNativeAsset, transferableAmount } from '@/shared/lib/utils';
import { BodyText, Icon } from '@/shared/ui';
import { AccountExplorers, AssetBalance, WalletIcon } from '@/shared/ui-entities';
import { type AnyAccount } from '@/domains/network';
import { useBalance } from '@/entities/balance';
import { WalletName } from '@/widgets/NameResolver';

interface Props {
  onSubmit: (event: FormEvent, account: AnyAccount) => void;
  account: AnyAccount;
  wallet: Wallet;
  chain: Chain;
}

export const Signer = ({ account, wallet, onSubmit, chain }: Props) => {
  const asset = getNativeAsset(chain.assets);

  const balance = useBalance({
    accountId: account.accountId,
    chainId: chain.chainId,
    assetId: asset.assetId,
  });

  return (
    <li
      className="flex cursor-pointer items-center justify-between gap-x-6 py-4 pr-2 pl-2 text-text-secondary hover:bg-hover"
      onClick={e => onSubmit(e, account)}
    >
      <div className="flex items-center gap-x-2 truncate">
        <WalletIcon type={wallet.type} />
        <BodyText className="truncate text-inherit">
          <WalletName wallet={wallet} />
        </BodyText>
        <AccountExplorers accountId={account.accountId} chain={chain} />
      </div>
      <AssetBalance
        value={transferableAmount(balance) || BN_ZERO}
        asset={asset}
        className="ml-auto text-right text-body text-inherit"
      />
      <Icon name="right" size={20} className="shrink-0" />
    </li>
  );
};
