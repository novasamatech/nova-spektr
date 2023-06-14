import { useEffect, useState } from 'react';

import { Icon } from '@renderer/components/ui';
import { useI18n } from '@renderer/context/I18nContext';
import { useNetworkContext } from '@renderer/context/NetworkContext';
import { Asset } from '@renderer/domain/asset';
import { Chain } from '@renderer/domain/chain';
import { ConnectionType } from '@renderer/domain/connection';
import { ChainId, SigningType } from '@renderer/domain/shared-kernel';
import { useToggle } from '@renderer/shared/hooks';
import { useChains } from '@renderer/services/network/chainsService';
import { useSettingsStorage } from '@renderer/services/settings/settingsStorage';
import NetworkBalances from '../NetworkBalances/NetworkBalances';
import ReceiveModal, { DataPayload } from '../ReceiveModal/ReceiveModal';
import { useAccount } from '@renderer/services/account/accountService';
import { isMultisig } from '@renderer/domain/account';
import BalancesFilters from '@renderer/screens/Balances/Balances/BalancesFilters';
import { BodyText, Button, SmallTitleText } from '@renderer/components/ui-redesign';
import { Header } from '@renderer/components/common';
import Transfer from '@renderer/screens/Transfer/Transfer';
import { AccountDS } from '@renderer/services/storage';
import SelectShardModal from '@renderer/screens/Balances/SelectShardModal/SelectShardModal';

const Balances = () => {
  const { t } = useI18n();

  const [query, setQuery] = useState('');
  const [activeAccounts, setActiveAccounts] = useState<AccountDS[]>([]);
  const accountIds = activeAccounts.map((a) => a.accountId).filter((a) => a);
  const [usedChains, setUsedChains] = useState<Record<ChainId, boolean>>({});
  const [data, setData] = useState<DataPayload>();

  const [isReceiveOpen, toggleReceive] = useToggle();
  const [isTransferOpen, toggleTransfer] = useToggle();
  const [isSelectShardsOpen, toggleSelectShardsOpen] = useToggle();

  const { connections } = useNetworkContext();
  const { getActiveAccounts } = useAccount();
  const { sortChains } = useChains();
  const activeAccountsFromWallet = getActiveAccounts();
  const isMultishard = activeAccountsFromWallet.length > 1;

  const { setHideZeroBalance, getHideZeroBalance } = useSettingsStorage();
  const [hideZeroBalance, setHideZeroBalanceState] = useState(getHideZeroBalance());

  const updateHideZeroBalance = (value: boolean) => {
    setHideZeroBalance(value);
    setHideZeroBalanceState(value);
  };

  useEffect(() => {
    updateChainsAndAccounts(activeAccountsFromWallet);
  }, [activeAccountsFromWallet]);

  const updateChainsAndAccounts = (accounts: AccountDS[]) => {
    if (accounts.length === 0) {
      setActiveAccounts([]);

      return;
    }

    const usedChains = accounts.reduce<Record<ChainId, boolean>>((acc, account) => {
      return account.chainId ? { ...acc, [account.chainId]: true } : acc;
    }, {});

    setActiveAccounts(accounts);
    setUsedChains(usedChains);
  };

  const hasRootAccount = activeAccounts.some((account) => !account.rootId);

  const sortedChains = sortChains(
    Object.values(connections).filter((c) => {
      const isDisabled = c.connection.connectionType !== ConnectionType.DISABLED;
      const rootOrChain = hasRootAccount || usedChains[c.chainId];
      const hasMultisigAccount = activeAccounts.some(isMultisig);
      const hasMultiPallet = !hasMultisigAccount || Boolean(c.api?.tx.multisig);

      return isDisabled && rootOrChain && hasMultiPallet;
    }),
  );

  const searchSymbolOnly = sortedChains.some((chain) =>
    chain.assets.some((a) => a.symbol.toLowerCase() === query.toLowerCase()),
  );

  const checkCanMakeActions = (): boolean => {
    return activeAccounts.some((account) =>
      [SigningType.MULTISIG, SigningType.PARITY_SIGNER].includes(account.signingType),
    );
  };

  const onReceive = (chain: Chain) => (asset: Asset) => {
    setData({ chain, asset });
    toggleReceive();
  };

  const onTransfer = (chain: Chain) => (asset: Asset) => {
    setData({ chain, asset });
    toggleTransfer();
  };

  const handleShardSelect = (selectedAccounts?: AccountDS[]) => {
    toggleSelectShardsOpen();
    if (Array.isArray(selectedAccounts)) {
      updateChainsAndAccounts(selectedAccounts);
    }
  };

  return (
    <>
      <div className="h-full flex flex-col items-start relative bg-main-app-background">
        <Header title={t('balances.title')}>
          <BalancesFilters
            searchQuery={query}
            hideZeroBalances={hideZeroBalance}
            onSearchChange={setQuery}
            onZeroBalancesChange={updateHideZeroBalance}
          />
        </Header>

        <section className="overflow-y-scroll mt-4 flex flex-col gap-y-4 w-[800px] mx-auto h-full">
          {isMultishard && (
            <SmallTitleText as="h3">
              {t('balances.shardsTitle')}{' '}
              <Button
                variant="text"
                suffixElement={<Icon name="edit" size={16} className="text-icon-accent" />}
                onClick={toggleSelectShardsOpen}
              >
                {activeAccounts.length} {t('balances.shards')}
              </Button>
            </SmallTitleText>
          )}
          {accountIds.length > 0 && (
            <ul className="flex-1 flex flex-col gap-y-4">
              {sortedChains.map((chain) => (
                <NetworkBalances
                  key={chain.chainId}
                  hideZeroBalance={hideZeroBalance}
                  searchSymbolOnly={searchSymbolOnly}
                  query={query.toLowerCase()}
                  chain={chain}
                  accountIds={accountIds}
                  canMakeActions={checkCanMakeActions()}
                  onReceiveClick={onReceive(chain)}
                  onTransferClick={onTransfer(chain)}
                />
              ))}

              <div className="hidden only:flex flex-col items-center justify-center gap-y-8 w-full h-full">
                <Icon as="img" name="emptyList" alt={t('balances.emptyStateLabel')} size={178} />
                <BodyText align="center" className="text-text-tertiary">
                  {t('balances.emptyStateLabel')}
                  <br />
                  {t('balances.emptyStateDescription')}
                </BodyText>
              </div>
            </ul>
          )}
        </section>
      </div>

      {data && <ReceiveModal data={data} isOpen={isReceiveOpen} onClose={toggleReceive} />}
      {data && (
        <Transfer
          assetId={data?.asset.assetId}
          chainId={data?.chain.chainId}
          isOpen={isTransferOpen}
          onClose={toggleTransfer}
        />
      )}
      {isMultishard && (
        <SelectShardModal
          accounts={activeAccountsFromWallet}
          activeAccounts={activeAccounts}
          isOpen={isSelectShardsOpen}
          onClose={handleShardSelect}
        />
      )}
    </>
  );
};

export default Balances;
