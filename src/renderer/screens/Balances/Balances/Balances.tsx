import { useEffect, useState } from 'react';

import { Icon, Input, Switch } from '@renderer/components/ui';
import { useI18n } from '@renderer/context/I18nContext';
import { useNetworkContext } from '@renderer/context/NetworkContext';
import { Asset } from '@renderer/domain/asset';
import { Chain } from '@renderer/domain/chain';
import { ConnectionType } from '@renderer/domain/connection';
import { PublicKey, SigningType } from '@renderer/domain/shared-kernel';
import useToggle from '@renderer/hooks/useToggle';
import { useChains } from '@renderer/services/network/chainsService';
import { useSettingsStorage } from '@renderer/services/settings/settingsStorage';
import NetworkBalances from '../NetworkBalances/NetworkBalances';
import ReceiveModal, { ReceivePayload } from '../ReceiveModal/ReceiveModal';
import { useAccount } from '@renderer/services/account/accountService';

const Balances = () => {
  const { t } = useI18n();

  const [query, setQuery] = useState('');
  const [publicKeys, setPublicKeys] = useState<PublicKey[]>([]);
  const [receiveData, setReceiveData] = useState<ReceivePayload>();

  const [isReceiveOpen, toggleReceive] = useToggle();

  const { connections } = useNetworkContext();
  const { getActiveAccounts } = useAccount();
  const { sortChains } = useChains();
  const activeAccounts = getActiveAccounts();

  const { setHideZeroBalance, getHideZeroBalance } = useSettingsStorage();
  const [hideZeroBalance, setHideZeroBalanceState] = useState(getHideZeroBalance());

  const updateHideZeroBalance = (value: boolean) => {
    setHideZeroBalance(value);
    setHideZeroBalanceState(value);
  };

  useEffect(() => {
    if (activeAccounts.length === 0) {
      setPublicKeys([]);

      return;
    }

    const activePublicKeys = activeAccounts.reduce<PublicKey[]>((acc, account) => {
      return account.publicKey ? [...acc, account.publicKey] : acc;
    }, []);

    setPublicKeys(activePublicKeys);
  }, [activeAccounts.length]);

  const sortedChains = sortChains(
    Object.values(connections).filter((c) => c.connection.connectionType !== ConnectionType.DISABLED),
  );

  const searchSymbolOnly = sortedChains.some((chain) =>
    chain.assets.some((a) => a.symbol.toLowerCase() === query.toLowerCase()),
  );

  const canMakeActions = activeAccounts.some((account) => account.signingType === SigningType.PARITY_SIGNER) || false;

  const onReceive = (chain: Chain) => (asset: Asset) => {
    setReceiveData({ chain, asset });
    toggleReceive();
  };

  return (
    <>
      <div className="h-full flex flex-col">
        <h1 className="font-semibold text-2xl text-neutral mb-9">{t('balances.title')}</h1>

        <div className="flex justify-between items-center mb-5">
          <Input
            className="w-[300px]"
            prefixElement={<Icon name="search" className="w-5 h-5" />}
            value={query}
            placeholder={t('balances.searchPlaceholder')}
            onChange={(e) => setQuery(e.target.value)}
          />
          <div className="text-sm text-neutral font-semibold flex gap-2.5">
            <Switch checked={hideZeroBalance} onChange={updateHideZeroBalance}>
              {t('balances.hideZeroBalancesLabel')}
            </Switch>
          </div>
        </div>

        {publicKeys.length > 0 && (
          <ul className="flex-1 overflow-y-auto">
            {sortedChains.map((chain) => (
              <NetworkBalances
                key={chain.chainId}
                hideZeroBalance={hideZeroBalance}
                searchSymbolOnly={searchSymbolOnly}
                query={query?.toLowerCase() || ''}
                chain={chain}
                publicKeys={publicKeys}
                canMakeActions={canMakeActions}
                onReceiveClick={onReceive(chain)}
              />
            ))}

            <div className="hidden only:flex w-full h-full flex-col items-center justify-center">
              <Icon name="noResults" size={380} />
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
