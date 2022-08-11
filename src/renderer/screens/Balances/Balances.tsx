import Balance from './Balance';
import { useNetworkContext } from '@renderer/context/NetworkContext';
import { TEST_PUBLIC_KEY } from '@renderer/services/balance/common/constants';
import { useChains } from '@renderer/services/network/chainsService';

const Balances = () => {
  const { connections } = useNetworkContext();
  const { sortChains } = useChains();

  return (
    <div className="h-full overflow-auto">
      <h1>Balances</h1>

      {sortChains(Object.values(connections)).map((chain) => {
        return (
          <div key={chain.chainId} className="mb-5 rounded-[10px]">
            <h2 className="flex items-center p-[15px] gap-x-2.5 h-[50px] bg-shade-2 text-sm font-bold text-gray-700 uppercase">
              <img src={chain.icon} className="w-5 h-5" alt="" />
              <div>{chain.name}</div>
            </h2>
            <div className="flex items-center justify-between p-[15px] gap-[30px] h-[30px] bg-shade-5 text-xs font-bold text-gray-500 uppercase">
              <div>Token</div>
              <div>Portfolio</div>
            </div>
            <div className="flex flex-col divide-y divide-shade-5 shadow-surface">
              {chain.assets?.map((asset) => (
                <Balance
                  key={`${chain.chainId}-${asset.assetId}`}
                  asset={asset}
                  chain={chain}
                  publicKey={TEST_PUBLIC_KEY}
                />
              ))}
            </div>
          </div>
        );
      })}
    </div>
  );
};

export default Balances;
