import cn from 'classnames';
import { useEffect, useState } from 'react';

import { PublicKey } from '@renderer/domain/shared-kernel';
import { Balance } from '@renderer/domain/balance';
import { useBalance } from '@renderer/services/balance/balanceService';
import { formatBalance, transferable } from '@renderer/services/balance/common/utils';
import { Asset, Chain } from '@renderer/services/network/common/types';

type Props = {
  chain: Chain;
  asset: Asset;
  publicKey: PublicKey;
};

const BalanceRow = ({ chain, asset, publicKey }: Props) => {
  const { getBalance } = useBalance();

  const [balance, setBalance] = useState<Balance>();

  // TODO: better to get all balances in parent component
  useEffect(() => {
    const getCurrentBalance = async () => {
      const data = await getBalance(publicKey, chain.chainId, asset.assetId.toString());
      setBalance(data);
    };

    getCurrentBalance();
  }, []);

  return (
    <div className="flex bg-white bg-opacity-25 h-[60px] items-center justify-between gap-7.5 p-[15px]">
      <div className="flex items-center gap-x-2.5">
        <div className="flex items-center justify-center bg-shade-40 border border-white border-opacity-75 rounded-full w-[34px] h-[34px] box-border">
          <img width="26px" height="26px" src={asset.icon} alt="" />
        </div>
        {asset.symbol}
      </div>
      <p className={cn(!balance?.verified && 'text-shade-50')} data-testid="balance">
        {balance && formatBalance(transferable(balance), asset.precision)} {asset.symbol}
      </p>
    </div>
  );
};

export default BalanceRow;
