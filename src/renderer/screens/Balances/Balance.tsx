import cn from 'classnames';

import { useBalance } from '@renderer/services/balance/balanceService';
import { HexString } from '@renderer/domain/types';
import { Asset, Chain } from '@renderer/services/network/common/types';
import { formatBalance, transferable } from '@renderer/services/balance/common/utils';

type Props = {
  chain: Chain;
  asset: Asset;
  publicKey: HexString;
};

const Balance = ({ chain, asset, publicKey }: Props) => {
  const { getBalance } = useBalance();
  const balance = getBalance(publicKey, chain.chainId, asset.assetId.toString());

  return (
    <div className="flex bg-white bg-opacity-25 h-[60px] items-center justify-between gap-[30px] p-[15px]">
      <div className="flex items-center gap-x-2.5">
        <div className="flex items-center justify-center bg-shade-40 border border-white border-opacity-75 rounded-full w-[34px] h-[34px] box-border">
          <img width="26px" height="26px" src={asset.icon} alt="" />
        </div>
        {asset.symbol}
      </div>
      <div className={cn(!balance?.verified && 'text-shade-50')} data-testid="balance">
        {balance && formatBalance(transferable(balance), asset.precision)} {asset.symbol}
      </div>
    </div>
  );
};

export default Balance;
