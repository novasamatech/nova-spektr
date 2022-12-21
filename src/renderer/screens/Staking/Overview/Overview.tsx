import { useEffect, useState } from 'react';
import { Trans } from 'react-i18next';

import { Dropdown, Icon, Input } from '@renderer/components/ui';
import { Option, ResultOption } from '@renderer/components/ui/Dropdowns/common/types';
import { useGraphql } from '@renderer/context/GraphqlContext';
import { useI18n } from '@renderer/context/I18nContext';
import { useNetworkContext } from '@renderer/context/NetworkContext';
import { Asset, StakingType } from '@renderer/domain/asset';
import { ConnectionStatus, ConnectionType } from '@renderer/domain/connection';
import { AccountID, ChainId } from '@renderer/domain/shared-kernel';
import TotalAmount from '@renderer/screens/Staking/Overview/components/TotalAmount/TotalAmount';
import { useAccount } from '@renderer/services/account/accountService';
import { useChains } from '@renderer/services/network/chainsService';
import { useSettingsStorage } from '@renderer/services/settings/settingsStorage';
import { useStakingData } from '@renderer/services/staking/stakingDataService';
import { useWallet } from '@renderer/services/wallet/walletService';
import { AboutStaking, Filter, InactiveChain, InfoBanners, NoAccounts, StakingList } from './components';

type NetworkOption = { asset: Asset; addressPrefix: number };

const Overview = () => {
  const { t } = useI18n();
  const { changeClient } = useGraphql();
  const { connections } = useNetworkContext();
  const { getActiveAccounts } = useAccount();
  const { getLiveWallets } = useWallet();
  const { sortChains, getChainsData } = useChains();
  const { staking, subscribeActiveEra, subscribeLedger } = useStakingData();
  const { setStakingNetwork, getStakingNetwork } = useSettingsStorage();

  const [query, setQuery] = useState('');
  const [isNetworkActive, setIsNetworkActive] = useState(true);
  const [activeNetwork, setActiveNetwork] = useState<ResultOption<NetworkOption>>();
  const [stakingNetworks, setStakingNetworks] = useState<Option<NetworkOption>[]>([]);

  const chainId = (activeNetwork?.id || '') as ChainId;
  const api = connections[chainId]?.api;
  const connection = connections[chainId]?.connection;
  const explorers = connections[chainId]?.explorers;

  const activeWallets = getLiveWallets();
  const activeAccounts = getActiveAccounts().filter((account) => !account.chainId || account.chainId === chainId);

  const accountAddresses = activeAccounts.reduce<AccountID[]>((acc, account) => {
    return account.accountId ? acc.concat(account.accountId) : acc;
  }, []);

  const totalStakes = Object.values(staking).reduce<string[]>((acc, stake) => {
    return acc.concat(stake?.total || '0');
  }, []);

  useEffect(() => {
    if (!connection) return;

    const isNotDisabled = connection.connectionType !== ConnectionType.DISABLED;
    const isNotError = connection.connectionStatus !== ConnectionStatus.ERROR;

    setIsNetworkActive(isNotDisabled && isNotError);
  }, [connection, isNetworkActive]);

  useEffect(() => {
    if (!chainId || !api?.isConnected || accountAddresses.length === 0) return;

    (async () => {
      await subscribeActiveEra(chainId, api);
      await subscribeLedger(chainId, api, accountAddresses);
    })();
  }, [api, accountAddresses.length]);

  useEffect(() => {
    (async () => {
      const chainsData = await getChainsData();

      const relaychains = sortChains(chainsData).reduce<Option<NetworkOption>[]>((acc, chain) => {
        const asset = chain.assets.find((asset) => asset.staking === StakingType.RELAYCHAIN) as Asset;
        if (!asset) return acc;

        return acc.concat({
          id: chain.chainId,
          value: { asset, addressPrefix: chain.addressPrefix },
          element: (
            <>
              <img src={chain.icon} alt="" width={20} height={20} />
              {chain.name}
            </>
          ),
        });
      }, []);

      const settingsChainId = getStakingNetwork();
      const settingsChain = relaychains.find((chain) => chain.id === settingsChainId);

      setStakingNetworks(relaychains);
      setActiveNetwork(settingsChain || { id: relaychains[0].id, value: relaychains[0].value });
      changeClient(settingsChainId || relaychains[0].id);
    })();
  }, []);

  return (
    <div className="h-full flex flex-col">
      <h1 className="font-semibold text-2xl text-neutral mb-9">{t('staking.title')}</h1>

      <div className="w-[900px] p-5 mx-auto bg-shade-2 rounded-2lg">
        <div className="flex items-center">
          <p className="text-xl text-neutral mr-5">
            <Trans
              t={t}
              i18nKey="staking.overview.stakingAssetLabel"
              values={{ asset: activeNetwork?.value.asset.symbol }}
            />
          </p>
          <Dropdown
            className="w-40"
            placeholder={t('staking.startStaking.selectNetworkLabel')}
            activeId={activeNetwork?.id}
            options={stakingNetworks}
            onChange={(option) => {
              setStakingNetwork(option.id as ChainId);
              changeClient(option.id as ChainId);
              setActiveNetwork(option);
            }}
          />
          {isNetworkActive && activeAccounts.length > 0 && (
            <TotalAmount
              totalStakes={totalStakes}
              asset={activeNetwork?.value.asset}
              accounts={accountAddresses}
              addressPrefix={activeNetwork?.value.addressPrefix}
            />
          )}
        </div>

        {isNetworkActive && activeAccounts.length > 0 && (
          <>
            <AboutStaking asset={activeNetwork?.value.asset} />
            <InfoBanners />

            <div className="flex items-center justify-between">
              <Input
                wrapperClass="!bg-shade-5 w-[300px]"
                placeholder={t('staking.overview.searchPlaceholder')}
                prefixElement={<Icon name="search" className="w-5 h-5" />}
                value={query}
                onChange={(e) => setQuery(e.target.value)}
              />
              <Filter />
            </div>

            <StakingList
              staking={staking}
              wallets={activeWallets}
              accounts={activeAccounts}
              asset={activeNetwork?.value.asset}
              addressPrefix={activeNetwork?.value.addressPrefix}
              explorers={explorers}
            />
          </>
        )}
        {isNetworkActive && !activeAccounts.length && <NoAccounts chainName={connections[chainId]?.name} />}
        {!isNetworkActive && <InactiveChain />}
      </div>
    </div>
  );
};

export default Overview;
