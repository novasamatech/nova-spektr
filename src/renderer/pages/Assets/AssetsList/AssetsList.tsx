import { useEffect, useState } from 'react';
import { Outlet } from 'react-router-dom';
import { useUnit } from 'effector-react';

import { BodyText, Button, Icon, SmallTitleText } from '@shared/ui';
import { useI18n } from '@app/providers';
import { useToggle } from '@shared/lib/hooks';
import { chainsService, isMultisigAvailable, networkModel } from '@entities/network';
import { useSettingsStorage } from '@entities/settings';
import { AssetsFilters, NetworkAssets, SelectShardModal } from './components';
import { Header } from '@renderer/components/common';
import type { Account, Chain } from '@shared/core';
import { ConnectionType } from '@shared/core';
import { walletModel, walletUtils } from '@entities/wallet';
import { currencyModel, priceProviderModel } from '@entities/price';
import { balanceModel } from '@entities/balance';
import { balanceSubscriptionModel } from '@features/balances';

export const AssetsList = () => {
  const { t } = useI18n();
  const activeWallet = useUnit(walletModel.$activeWallet);
  const activeAccounts = useUnit(walletModel.$activeAccounts);
  const assetsPrices = useUnit(priceProviderModel.$assetsPrices);
  const fiatFlag = useUnit(priceProviderModel.$fiatFlag);
  const currency = useUnit(currencyModel.$activeCurrency);
  const connections = useUnit(networkModel.$connections);
  const chains = useUnit(networkModel.$chains);
  const balances = useUnit(balanceModel.$balances);
  const subscriptions = useUnit(balanceSubscriptionModel.$subscriptions);

  useEffect(() => {
    console.log('active balance subscriptions', Object.keys(subscriptions).length);
  }, [subscriptions]);

  const { setHideZeroBalance, getHideZeroBalance } = useSettingsStorage();

  const [isSelectShardsOpen, toggleSelectShardsOpen] = useToggle();

  const [query, setQuery] = useState('');
  const [sortedChains, setSortedChains] = useState<Chain[]>([]);

  const [activeShards, setActiveShards] = useState<Account[]>([]);
  const [hideZeroBalance, setHideZeroBalanceState] = useState(getHideZeroBalance());

  const isMultishard = walletUtils.isMultiShard(activeWallet);
  const isMultisig = walletUtils.isMultisig(activeWallet);

  useEffect(() => {
    priceProviderModel.events.assetsPricesRequested({ includeRates: true });
  }, []);

  useEffect(() => {
    updateAccounts(activeAccounts);
  }, [activeAccounts]);

  const updateAccounts = (accounts: Account[]) => {
    setActiveShards(accounts.length > 0 ? accounts : []);
  };

  useEffect(() => {
    const filteredChains = Object.values(chains).filter((c) => {
      const isDisabled = connections[c.chainId]?.connectionType === ConnectionType.DISABLED;
      const hasMultiPallet = !isMultisig || isMultisigAvailable(c.options);

      return !isDisabled && hasMultiPallet;
    });

    setSortedChains(
      chainsService.sortChainsByBalance(
        filteredChains,
        balances,
        assetsPrices,
        fiatFlag ? currency?.coingeckoId : undefined,
      ),
    );
  }, [balances, assetsPrices]);

  const updateHideZeroBalance = (value: boolean) => {
    setHideZeroBalance(value);
    setHideZeroBalanceState(value);
  };

  const searchSymbolOnly = sortedChains.some((chain) => {
    return chain.assets.some((a) => a.symbol.toLowerCase() === query.toLowerCase());
  });

  const handleShardSelect = (selectedAccounts?: Account[]) => {
    toggleSelectShardsOpen();

    if (Array.isArray(selectedAccounts)) {
      updateAccounts(selectedAccounts);
    }
  };

  return (
    <>
      <section className="h-full flex flex-col">
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
              {activeShards.length} {t('balances.shards')}
            </Button>
          </div>
        )}

        <div className="flex flex-col gap-y-4 w-full h-full overflow-y-scroll">
          {activeShards.length > 0 && (
            <ul className="flex flex-col gap-y-4 items-center w-full py-4">
              {sortedChains.map((chain) => (
                <NetworkAssets
                  key={chain.chainId}
                  hideZeroBalance={hideZeroBalance}
                  searchSymbolOnly={searchSymbolOnly}
                  query={query.toLowerCase()}
                  chain={chain}
                  accounts={activeShards}
                  canMakeActions={!walletUtils.isWatchOnly(activeWallet)}
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
          accounts={activeAccounts}
          activeShards={activeShards}
          isOpen={isSelectShardsOpen}
          onClose={handleShardSelect}
        />
      )}

      <Outlet />
    </>
  );
};
