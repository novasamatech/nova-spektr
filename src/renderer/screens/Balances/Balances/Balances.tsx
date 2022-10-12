import { AnyJson } from '@polkadot/types/types';
import { u8aConcat, u8aToHex } from '@polkadot/util';
import { blake2AsU8a } from '@polkadot/util-crypto';
import { useEffect, useState } from 'react';

import { Icon, Input, Switch } from '@renderer/components/ui';
import { useI18n } from '@renderer/context/I18nContext';
import { useNetworkContext } from '@renderer/context/NetworkContext';
import { Asset } from '@renderer/domain/asset';
import { Chain } from '@renderer/domain/chain';
import { ConnectionType } from '@renderer/domain/connection';
import { PublicKey } from '@renderer/domain/shared-kernel';
import { WalletType } from '@renderer/domain/wallet';
import useToggle from '@renderer/hooks/useToggle';
import { useChains } from '@renderer/services/network/chainsService';
import { useSettingsStorage } from '@renderer/services/settings/settingsStorage';
import { useWallet } from '@renderer/services/wallet/walletService';
import NetworkBalances from '../NetworkBalances/NetworkBalances';
import ReceiveModal, { ReceivePayload } from '../ReceiveModal/ReceiveModal';

const Balances = () => {
  const { t } = useI18n();

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

  const sortedChains = sortChains(
    Object.values(connections).filter((c) => c.connection.connectionType !== ConnectionType.DISABLED),
  );

  const searchSymbolOnly = sortedChains.some((chain) =>
    chain.assets.some((a) => a.symbol.toLowerCase() === query.toLowerCase()),
  );

  const canMakeActions = activeWallets?.some((wallet) => wallet.type === WalletType.PARITY) || false;

  const onReceive = (chain: Chain) => (asset: Asset) => {
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

  // Method to get all Crowdloans for specific relay chain
  const getCrowdLoan = async () => {
    const dotApi = connections['0x91b171bb158e2d3848fa23a9f1c25182fb8e20313b2c1eb49219da7a70ce90c3'].api;
    // const ksmApi = connections['0xb0a8d493285c2df73290dfb7e61f870f17b41801197a149ca93654499ea3dafe'].api;
    const api = dotApi;

    if (!api || !activeWallets) return;

    const publicKey = activeWallets[0].mainAccounts[0].publicKey;

    const createChildKey = (info: any): string =>
      u8aToHex(
        u8aConcat(
          ':child_storage:default:',
          blake2AsU8a(u8aConcat('crowdloan', (info.fundIndex || info.trieIndex).toU8a())),
        ),
      );

    try {
      const entries = await api.query.crowdloan.funds.entries<any>();
      const childKeys = entries.map(([_, info]) => createChildKey(info.unwrap()));

      const storageRequests = childKeys.reduce((acc, childKey) => {
        const getValue = (async (key): Promise<AnyJson> => {
          const storage = await api.rpc.childstate.getStorage(key, publicKey);
          const storageData = api.registry.createType('Option<StorageData>', storage);

          if (storageData.isSome) {
            return api.registry.createType('Balance', storageData.unwrap()).toHuman();
          } else {
            return api.registry.createType('Balance').toHuman();
          }
        })(childKey);

        return [...acc, getValue];
      }, [] as Promise<AnyJson>[]);

      const crowdloanValues = await Promise.all(storageRequests);
      console.info(crowdloanValues.filter((value) => value !== '0'));
    } catch (error) {
      console.warn('🔴 Error getting crowdloans ==> ', error);
    }
  };

  return (
    <>
      <button className="p-1 bg-success text-white rounded-2lg" type="button" onClick={getCrowdLoan}>
        GET
      </button>
      <div className="h-full flex flex-col">
        <h1 className="font-semibold text-2xl text-neutral mb-9">{t('balances.title')}</h1>

        <div className="flex justify-between items-center mb-5">
          <Input
            className="w-[300px]"
            prefixElement={<Icon name="search" className="w-5 h-5" />}
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder={t('balances.searchPlaceholder')}
          />
          <div className="text-sm text-neutral font-semibold flex gap-2.5">
            {t('balances.hideZeroBalancesLabel')} <Switch checked={hideZeroBalance} onChange={updateHideZeroBalance} />
          </div>
        </div>

        {publicKey && (
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
                onTransferClick={() => console.log(t('transfers.title'))}
                onReceiveClick={onReceive(chain)}
              />
            ))}

            <div className="hidden only:flex w-full h-full flex-col items-center justify-center">
              <Icon name="noResult" size={380} />
              <p className="text-neutral text-3xl font-bold">{t('balances.emptyStateLabel')}</p>
              <p className="text-neutral-variant text-base font-normal">{t('balances.emptyStateDescription')}</p>
            </div>
          </ul>
        )}
      </div>

      <ReceiveModal data={receiveData} isOpen={isReceiveOpen} onClose={toggleReceive} />
    </>
  );
};

export default Balances;
