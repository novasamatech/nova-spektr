import { BN_ZERO } from '@polkadot/util';
import { type FormEvent } from 'react';

import { type Account, type Chain, type WalletType } from '@/shared/core';
import { toAddress, transferableAmount } from '@/shared/lib/utils';
import { BodyText, Icon } from '@/shared/ui';
import { AssetBalance } from '@/entities/asset';
import { useBalance } from '@/entities/balance';
import { WalletIcon } from '@/entities/wallet';

interface Props {
  onSubmit: (event: FormEvent, account: Account) => void;
  account: Account;
  walletType: WalletType;
  walletName?: string;
  chain: Chain;
}

export const Signer = ({ account, walletName, walletType, onSubmit, chain }: Props) => {
  const balance = useBalance({
    accountId: account.accountId,
    chainId: chain.chainId,
    assetId: chain.assets[0].assetId.toString(),
  });

  return (
    <li
      className="grid cursor-pointer grid-flow-col grid-cols-[30px,1fr,100px,30px] items-center truncate py-4 pl-2 pr-2 hover:bg-hover"
      onClick={(e) => onSubmit(e, account)}
    >
      <WalletIcon type={walletType} />
      <div className="flex flex-col text-text-secondary">
        {walletName && <BodyText className="text-inherit">{walletName}</BodyText>}
        <BodyText className="text-inherit">
          {toAddress(account.accountId, { prefix: chain.addressPrefix, chunk: 6 })}
        </BodyText>
      </div>
      {chain.assets[0] && (
        <AssetBalance
          value={transferableAmount(balance) || BN_ZERO}
          asset={chain.assets[0]}
          className="ml-auto mr-6 text-body text-inherit"
        />
      )}
      <Icon name="right" size={20} />
    </li>
  );
};
