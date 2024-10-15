import { BN_ZERO } from '@polkadot/util';
import { type FormEvent } from 'react';

import { type AccountId, type Chain, type WalletType } from '@/shared/core';
import { transferableAmount } from '@/shared/lib/utils';
import { BodyText, Icon } from '@/shared/ui';
import { AssetBalance } from '@/entities/asset';
import { useBalance } from '@/entities/balance';
import { WalletIcon } from '@/entities/wallet';

interface Props {
  onSubmit: (event: FormEvent, accountId: AccountId) => void;
  accountId: AccountId;
  walletType: WalletType;
  walletName?: string;
  chain: Chain;
}

export const Signer = ({ accountId, walletName, walletType, onSubmit, chain }: Props) => {
  const balance = useBalance({
    accountId,
    chainId: chain.chainId,
    assetId: chain.assets[0].assetId.toString(),
  });

  return (
    <li
      className="grid cursor-pointer grid-flow-col grid-cols-[30px,1fr,100px,30px] items-center truncate py-4 pl-2 pr-2 hover:bg-hover"
      key={accountId}
      onClick={(e) => onSubmit(e, accountId)}
    >
      <WalletIcon type={walletType} />
      <BodyText className="text-inherit">{walletName}</BodyText>
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
