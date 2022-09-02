import { useEffect, useState } from 'react';

import { useNetworkContext } from '@renderer/context/NetworkContext';
import { useChains } from '@renderer/services/network/chainsService';
import { useWallet } from '@renderer/services/wallet/walletService';
import { PublicKey } from '@renderer/domain/shared-kernel';
import { Icon, Input, Switch } from '@renderer/components/ui';
import NetworkBalances from './NetworkBalances';
import { useSettingsStorage } from '@renderer/services/settings/settingsStorage';

const Balances = () => {
  const [query, setQuery] = useState('');

  const { connections } = useNetworkContext();
  const { getActiveWallets } = useWallet();
  const { sortChains } = useChains();
  const [publicKey, setPublicKey] = useState<PublicKey>();
  const activeWallets = getActiveWallets();

  const { setHideZeroBalance, getHideZeroBalance } = useSettingsStorage();
  const [hideZeroBalance, setHideZeroBalanceState] = useState(getHideZeroBalance());

  const updateHideZeroBalance = (value: boolean) => {
    setHideZeroBalance(value);
    setHideZeroBalanceState(value);
  };

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
    <div className="h-full flex flex-col">
      <div className="flex-none">
        <h1 className="font-semibold text-2xl text-neutral mb-9">Balances</h1>

        <div className="flex justify-between items-center mb-5">
          <Input
            className="w-[300px]"
            prefixElement={<Icon as="svg" name="search" className="w-5 h-5" />}
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search by token, network or anything"
          />
          <div className="text-sm text-neutral font-semibold flex gap-2.5">
            Hide zero balances <Switch checked={hideZeroBalance} onChange={updateHideZeroBalance} />
          </div>
        </div>
      </div>
      <div className="flex-1 overflow-x-auto">
        {sortedChains.map((chain) => (
          <NetworkBalances
            key={chain.chainId}
            hideZeroBalance={hideZeroBalance}
            query={query ? query.toLowerCase() : ''}
            chain={chain}
            publicKey={publicKey}
          />
        ))}
        <div className="hidden only:flex w-full h-full flex-col items-center justify-center">
          <Icon as="svg" name="empty" className="w-[380px] h-[380px] text-neutral-variant" />
          <p className="text-neutral text-3xl font-bold">Nothing to show</p>
          <p className="text-neutral-variant text-base font-normal">Try to reset filters or search for another key</p>
        </div>
      </div>
    </div>
  );
};

export default Balances;
