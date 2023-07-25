import { useEffect, useState } from 'react';

import { Icon, BodyText, Button, SmallTitleText } from '@renderer/shared/ui';
import { useI18n, useNetworkContext } from '@renderer/app/providers';
import { Asset } from '@renderer/entities/asset/model/asset';
import { Chain } from '@renderer/entities/chain/model/chain';
import { ConnectionType } from '@renderer/domain/connection';
import { SigningType } from '@renderer/domain/shared-kernel';
import { useToggle } from '@renderer/shared/lib/hooks';
import { useChains } from '@renderer/entities/network/lib/chainsService';
import { useSettingsStorage } from '@renderer/entities/setttings/lib/settingsStorage';
import { useAccount } from '@renderer/entities/account/lib/accountService';
import { isMultisig, Account } from '@renderer/entities/account/model/account';
import { AssetsFilters, NetworkAssets, ReceiveModal, SelectShardModal } from './components';
import { Header } from '@renderer/components/common';
import { useBalance } from '@renderer/entities/asset/lib/balanceService';
import Transfer from '@renderer/screens/Transfer/Transfer';

export const Assets = () => {
  const { t } = useI18n();
  const { connections } = useNetworkContext();
  const { getActiveAccounts } = useAccount();
  const { getLiveBalances } = useBalance();
  const { sortChainsByBalance } = useChains();
  const { setHideZeroBalance, getHideZeroBalance } = useSettingsStorage();

  const [isReceiveOpen, toggleReceive] = useToggle();
  const [isTransferOpen, toggleTransfer] = useToggle();
  const [isSelectShardsOpen, toggleSelectShardsOpen] = useToggle();

  const [query, setQuery] = useState('');
  const [activeChain, setActiveChain] = useState<Chain>();
  const [activeAsset, setActiveAsset] = useState<Asset>();
  const [sortedChains, setSortedChains] = useState<Chain[]>([]);

  const [activeAccounts, setActiveAccounts] = useState<Account[]>([]);
  const [hideZeroBalance, setHideZeroBalanceState] = useState(getHideZeroBalance());

  const activeAccountsFromWallet = getActiveAccounts();
  const balances = getLiveBalances(activeAccounts.map((a) => a.accountId));

  const isMultishard = activeAccountsFromWallet.length > 1;

  const firstActiveAccount = activeAccountsFromWallet.length > 0 && activeAccountsFromWallet[0].accountId;
  const activeWallet = activeAccountsFromWallet.length > 0 && activeAccountsFromWallet[0].walletId;

  useEffect(() => {
    updateAccounts(activeAccountsFromWallet);
  }, [firstActiveAccount, activeWallet]);

  const updateAccounts = (accounts: Account[]) => {
    setActiveAccounts(accounts.length ? accounts : []);
  };

  useEffect(() => {
    const filteredChains = Object.values(connections).filter((c) => {
      const isDisabled = c.connection.connectionType === ConnectionType.DISABLED;
      const hasMultisigAccount = activeAccounts.some(isMultisig);
      const hasMultiPallet = !hasMultisigAccount || c.connection.hasMultisigPallet !== false;

      return !isDisabled && hasMultiPallet;
    });

    setSortedChains(sortChainsByBalance(filteredChains, balances));
  }, [balances]);

  const updateHideZeroBalance = (value: boolean) => {
    setHideZeroBalance(value);
    setHideZeroBalanceState(value);
  };

  const searchSymbolOnly = sortedChains.some((chain) => {
    return chain.assets.some((a) => a.symbol.toLowerCase() === query.toLowerCase());
  });

  const checkCanMakeActions = (): boolean => {
    return activeAccounts.some((account) =>
      [SigningType.MULTISIG, SigningType.PARITY_SIGNER].includes(account.signingType),
    );
  };

  const onReceive = (chain: Chain) => (asset: Asset) => {
    setActiveChain(chain);
    setActiveAsset(asset);
    toggleReceive();
  };

  const onTransfer = (chain: Chain) => (asset: Asset) => {
    setActiveChain(chain);
    setActiveAsset(asset);
    toggleTransfer();
  };

  const handleShardSelect = (selectedAccounts?: Account[]) => {
    toggleSelectShardsOpen();

    if (Array.isArray(selectedAccounts)) {
      updateAccounts(selectedAccounts);
    }
  };

  return (
    <>
      <section className="h-full flex flex-col items-start relative">
        <Header title={t('balances.title')} titleClass="py-[3px]" headerClass="pt-4 pb-[15px]">
          <AssetsFilters
            searchQuery={query}
            hideZeroBalances={hideZeroBalance}
            onSearchChange={setQuery}
            onZeroBalancesChange={updateHideZeroBalance}
          />
        </Header>

        {isMultishard && (
          <div className="w-[546px] mx-auto flex items-center mt-4">
            <SmallTitleText as="h3">{t('balances.shardsTitle')} </SmallTitleText>
            <Button
              variant="text"
              suffixElement={<Icon name="edit" size={16} className="text-icon-accent" />}
              className="outline-offset-reduced"
              onClick={toggleSelectShardsOpen}
            >
              {activeAccounts.length} {t('balances.shards')}
            </Button>
          </div>
        )}

        <div className="flex flex-col gap-y-4 w-full h-full overflow-y-scroll">
          {activeAccounts.length > 0 && (
            <ul className="flex flex-col gap-y-4 items-center w-full py-4">
              {sortedChains.map((chain) => (
                <NetworkAssets
                  key={chain.chainId}
                  hideZeroBalance={hideZeroBalance}
                  searchSymbolOnly={searchSymbolOnly}
                  query={query.toLowerCase()}
                  chain={chain}
                  accounts={activeAccounts}
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
        </div>
      </section>

      {isMultishard && (
        <SelectShardModal
          accounts={activeAccountsFromWallet}
          activeAccounts={activeAccounts}
          isOpen={isSelectShardsOpen}
          onClose={handleShardSelect}
        />
      )}

      {/* TODO: Make navigational modal */}
      {activeAsset && activeChain && (
        <ReceiveModal chain={activeChain} asset={activeAsset} isOpen={isReceiveOpen} onClose={toggleReceive} />
      )}

      {/* TODO: Make navigational modal */}
      {activeAsset && activeChain && (
        <Transfer
          isOpen={isTransferOpen}
          assetId={activeAsset.assetId}
          chainId={activeChain.chainId}
          onClose={toggleTransfer}
        />
      )}
    </>
  );
};
