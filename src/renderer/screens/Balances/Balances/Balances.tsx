import { useEffect, useState } from 'react';

import useToggle from '@renderer/hooks/useToggle';
import { Icon, Input, Switch } from '@renderer/components/ui';
import { useNetworkContext } from '@renderer/context/NetworkContext';
import { Asset } from '@renderer/domain/asset';
import { Chain } from '@renderer/domain/chain';
import { PublicKey } from '@renderer/domain/shared-kernel';
import { WalletType } from '@renderer/domain/wallet';
import { useChains } from '@renderer/services/network/chainsService';
import { useSettingsStorage } from '@renderer/services/settings/settingsStorage';
import { useWallet } from '@renderer/services/wallet/walletService';
import NetworkBalances from '../NetworkBalances/NetworkBalances';
import ReceiveModal, { ReceivePayload } from '../ReceiveModal/ReceiveModal';

const Balances = () => {
  const [query, setQuery] = useState('');
  const [publicKey, setPublicKey] = useState<PublicKey>();
  const [receiveData, setReceiveData] = useState<ReceivePayload>();

  const [isReceiveOpen, toggleReceive] = useToggle();

  const { connections } = useNetworkContext();
  const { getActiveWallets } = useWallet();
  const { sortChains } = useChains();
  const activeWallets = getActiveWallets();

  const { setHideZeroBalance, getHideZeroBalance } = useSettingsStorage();
  const [hideZeroBalance, setHideZeroBalanceState] = useState(getHideZeroBalance());

  const updateHideZeroBalance = (value: boolean) => {
    setHideZeroBalance(value);
    setHideZeroBalanceState(value);
  };

  useEffect(() => {
    if (!activeWallets || activeWallets.length === 0) return;

    const activePublicKey = activeWallets[0].mainAccounts[0].publicKey;
    setPublicKey(activePublicKey);
  }, [activeWallets]);

  const sortedChains = sortChains(Object.values(connections));

  const searchSymbolOnly = sortedChains.some((chain) =>
    chain.assets.some((a) => a.symbol.toLowerCase() === query.toLowerCase()),
  );

  const canMakeActions = activeWallets?.some((wallet) => wallet.type === WalletType.PARITY) || false;

  const onReceive = (asset: Asset, chain: Chain) => {
    setReceiveData({
      chain,
      asset,
      activeWallets: (activeWallets || []).map((wallet) => ({
        name: wallet.name,
        publicKey: wallet.mainAccounts[0].publicKey,
      })),
    });
    toggleReceive();
  };

  return (
    <>
      <div className="h-full flex flex-col">
        <div className="flex-none">
          <h1 className="font-semibold text-2xl text-neutral mb-9">Balances</h1>

          <div className="flex justify-between items-center mb-5">
            <Input
              className="w-[300px]"
              prefixElement={<Icon name="search" className="w-5 h-5" />}
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search by token, network or anything"
            />
            <div className="text-sm text-neutral font-semibold flex gap-2.5">
              Hide zero balances <Switch checked={hideZeroBalance} onChange={updateHideZeroBalance} />
            </div>
          </div>
        </div>

        {publicKey ? (
          <ul className="flex-1 overflow-y-auto">
            {sortedChains.map((chain) => (
              <NetworkBalances
                key={chain.chainId}
                hideZeroBalance={hideZeroBalance}
                searchSymbolOnly={searchSymbolOnly}
                query={query?.toLowerCase() || ''}
                chain={chain}
                publicKey={publicKey}
                canMakeActions={canMakeActions}
                onTransfer={() => console.log('transfer')}
                onReceive={(asset) => onReceive(asset, chain)}
              />
            ))}
          </ul>
        ) : (
          <div className="flex w-full h-full flex-col items-center justify-center">
            <Icon name="empty" size={380} className="text-neutral-variant" />
            <p className="text-neutral text-3xl font-bold">Nothing to show</p>
            <p className="text-neutral-variant text-base font-normal">Try to reset filters or search for another key</p>
          </div>
        )}
      </div>

      <ReceiveModal data={receiveData} isOpen={isReceiveOpen} onClose={toggleReceive} />
    </>
  );
};

export default Balances;
