import { useEffect, useState } from 'react';
import sortBy from 'lodash/sortBy';

import BalanceRow from './BalanceRow';
import { useNetworkContext } from '@renderer/context/NetworkContext';
import { useChains } from '@renderer/services/network/chainsService';
import { useWallet } from '@renderer/services/wallet/walletService';
import { PublicKey } from '@renderer/domain/shared-kernel';

const Balances = () => {
  const { connections } = useNetworkContext();
  const { getActiveWallets } = useWallet();
  const { sortChains } = useChains();
  const [publicKey, setPublicKey] = useState<PublicKey>();
  const activeWallets = getActiveWallets();

  useEffect(() => {
    (async () => {
      if (activeWallets && activeWallets.length > 0) {
        const tempPublicKey = activeWallets[0].mainAccounts[0].publicKey;
        setPublicKey(tempPublicKey);
      }
    })();
  }, [activeWallets]);

  const sortedChains = sortChains(Object.values(connections));

  return (
    <div className="h-full overflow-auto">
      <h1>Balances</h1>

      {sortedChains.map((chain) => (
        <div key={chain.chainId} className="mb-5 rounded-2lg">
          <h2 className="flex items-center p-[15px] gap-x-2.5 h-[50px] bg-shade-2 text-sm font-bold text-gray-700 uppercase">
            <img src={chain.icon} className="w-5 h-5" alt="" />
            <p>{chain.name}</p>
          </h2>
          <div className="flex items-center justify-between p-[15px] gap-7.5 h-7.5 bg-shade-5 text-xs font-bold text-gray-500 uppercase">
            <p>Token</p>
            <p>Portfolio</p>
          </div>
          <div className="flex flex-col divide-y divide-shade-5 shadow-surface">
            {publicKey &&
              sortBy(chain.assets || [], (a) => a.symbol.toLowerCase()).map((asset) => (
                <BalanceRow
                  key={`${chain.chainId}-${asset.assetId}`}
                  asset={asset}
                  chain={chain}
                  publicKey={publicKey}
                />
              ))}
          </div>
        </div>
      ))}
    </div>
  );
};

export default Balances;
