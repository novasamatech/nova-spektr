import { BN_ZERO } from '@polkadot/util';
import { useUnit } from 'effector-react';
import { type FormEvent } from 'react';

import { type AccountId, type Chain } from '@/shared/core';
import { toAddress, transferableAmount } from '@/shared/lib/utils';
import { Icon } from '@/shared/ui';
import { AssetBalance } from '@/entities/asset';
import { balanceModel, balanceUtils } from '@/entities/balance';
import { AddressWithName } from '@/entities/wallet';

interface Props {
  onSubmit: (event: FormEvent, accountId: AccountId) => void;
  accountId: AccountId;
  name?: string;
  chain: Chain;
}

export const Signer = ({ accountId, name, onSubmit, chain }: Props) => {
  //   const balance = useBalance({
  //     accountId,
  //     chainId: chain.chainId,
  //     assetId: asset.assetId.toString(),
  //   });

  const balances = useUnit(balanceModel.$balances);
  const balance = balanceUtils.getBalance(balances, accountId, chain.chainId, chain.assets[0].assetId.toString());

  console.log(accountId, chain.chainId, chain.assets[0].assetId.toString());
  console.log('balance', balance);

  return (
    <li
      className="grid cursor-pointer grid-flow-col grid-cols-[1fr,100px,30px] items-center justify-items-end truncate py-4 pl-5 pr-2 hover:bg-hover"
      key={accountId}
      onClick={(e) => onSubmit(e, accountId)}
    >
      <AddressWithName name={name} address={toAddress(accountId, { prefix: chain.addressPrefix })} type="adaptive" />
      {chain.assets[0] && (
        <AssetBalance
          value={transferableAmount(balance) || BN_ZERO}
          asset={chain.assets[0]}
          className="ml-auto text-body text-inherit"
        />
      )}
      <Icon name="right" size={20} />
    </li>
  );
};
