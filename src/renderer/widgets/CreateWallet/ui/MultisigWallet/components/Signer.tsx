import { BN_ZERO } from '@polkadot/util';
import { type FormEvent } from 'react';

import { type Chain, type Wallet } from '@/shared/core';
import { nonNullable, transferableAmount } from '@/shared/lib/utils';
import { BodyText, Icon } from '@/shared/ui';
import { AccountExplorers } from '@/shared/ui-entities';
import { type AnyAccount } from '@/domains/network';
import { AssetBalance } from '@/entities/asset';
import { useBalance } from '@/entities/balance';
import { WalletIcon } from '@/entities/wallet';

interface Props {
  onSubmit: (event: FormEvent, account: AnyAccount) => void;
  account: AnyAccount;
  wallet: Wallet;
  chain: Chain;
}

export const Signer = ({ account, wallet, onSubmit, chain }: Props) => {
  const balance = useBalance({
    accountId: account.accountId,
    chainId: chain.chainId,
    assetId: chain.assets.at(0)?.assetId.toString() || '',
  });

  return (
    <li
      className="flex cursor-pointer items-center justify-between gap-x-6 py-4 pl-2 pr-2 text-text-secondary hover:bg-hover"
      onClick={(e) => onSubmit(e, account)}
    >
      <div className="flex items-center gap-x-2 truncate">
        <WalletIcon type={wallet.type} className="shrink-0" />
        {wallet.name && <BodyText className="truncate text-inherit">{wallet.name}</BodyText>}
        <AccountExplorers accountId={account.accountId} chain={chain} />
      </div>
      {nonNullable(chain.assets.at(0)) && (
        <AssetBalance
          value={transferableAmount(balance) || BN_ZERO}
          asset={chain.assets[0]}
          className="ml-auto text-right text-body text-inherit"
        />
      )}
      <Icon name="right" size={20} className="shrink-0" />
    </li>
  );
};
