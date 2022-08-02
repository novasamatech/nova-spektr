import { useLiveQuery } from 'dexie-react-hooks';

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
  const balance = useLiveQuery(() => getBalance(publicKey, chain.chainId, asset.assetId.toString()));

  return (
    <div className="flex bg-white bg-opacity-25 h-[60px] items-center justify-between gap-[30px] p-[15px]">
      <div className="flex items-center gap-[10px]">
        <div className="flex items-center justify-center bg-shade-40 border border-white border-opacity-75 rounded-full w-[34px] h-[34px] box-border">
          <img src={asset.icon} className="w-[26px] h-[26px]" />
        </div>
        {asset.symbol}
      </div>
      <div>
        {balance && formatBalance(transferable(balance), asset.precision)} {asset.symbol}
      </div>
    </div>
  );
};

export default Balance;
