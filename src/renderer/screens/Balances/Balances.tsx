import { useEffect, useState } from 'react';

import { useNetworkContext } from '@renderer/context/NetworkContext';
import { useChains } from '@renderer/services/network/chainsService';
import { useWallet } from '@renderer/services/wallet/walletService';
import { PublicKey } from '@renderer/domain/shared-kernel';
import { Icon, Input, Switch } from '@renderer/components/ui';
import NetworkBalances from './NetworkBalances';

const Balances = () => {
  const [hideZeroBalances, setHideZeroBalances] = useState(false);
  const [query, setQuery] = useState('');

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
      <h1 className="font-semibold text-2xl text-neutral mb-9">Balances</h1>

      <div className="flex justify-between items-center mb-5">
        <Input
          className="w-[300px]"
          prefixElement={<Icon as="svg" name="search" className="w-5 h-5" />}
          value={query}
          onChange={(e) => setQuery(e.target.value.toLowerCase())}
          placeholder="Search by token, network or anything"
        />
        <div className="text-sm text-neutral font-semibold flex gap-2.5">
          Hide zero balances <Switch checked={hideZeroBalances} onChange={setHideZeroBalances} />
        </div>
      </div>

      {sortedChains.map((chain) => (
        <NetworkBalances
          key={chain.chainId}
          hideZeroBalances={hideZeroBalances}
          query={query}
          chain={chain}
          publicKey={publicKey}
        />
      ))}
    </div>
  );
};

export default Balances;
