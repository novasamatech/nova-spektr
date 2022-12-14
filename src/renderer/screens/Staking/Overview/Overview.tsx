import { useEffect, useState } from 'react';
import { Trans } from 'react-i18next';

import { ButtonLink, Dropdown, Icon, Input } from '@renderer/components/ui';
import { Option, ResultOption } from '@renderer/components/ui/Dropdowns/common/types';
import { useGraphql } from '@renderer/context/GraphqlContext';
import { useI18n } from '@renderer/context/I18nContext';
import { useNetworkContext } from '@renderer/context/NetworkContext';
import { Asset, StakingType } from '@renderer/domain/asset';
import { ConnectionStatus, ConnectionType } from '@renderer/domain/connection';
import { AccountID, ChainId } from '@renderer/domain/shared-kernel';
import Paths from '@renderer/routes/paths';
import TotalAmount from '@renderer/screens/Staking/Overview/components/TotalAmount/TotalAmount';
import { useChains } from '@renderer/services/network/chainsService';
import { useSettingsStorage } from '@renderer/services/settings/settingsStorage';
import { useStakingData } from '@renderer/services/staking/stakingDataService';
import { useWallet } from '@renderer/services/wallet/walletService';
import { AboutStaking, Filter, InfoBanners, StakingList } from './components';

type NetworkOption = { asset: Asset; addressPrefix: number };

const Overview = () => {
  const { t } = useI18n();
  const { setGraphqlEndpoint } = useGraphql();
  const { connections } = useNetworkContext();
  const { getActiveWallets } = useWallet();
  const { sortChains, getChainsData } = useChains();
  const { staking, subscribeActiveEra, subscribeLedger } = useStakingData();
  const { setStakingNetwork, getStakingNetwork } = useSettingsStorage();

  const [query, setQuery] = useState('');
  const [isNetworkActive, setIsNetworkActive] = useState(true);
  const [activeNetwork, setActiveNetwork] = useState<ResultOption<NetworkOption>>();
  const [stakingNetworks, setStakingNetworks] = useState<Option<NetworkOption>[]>([]);

  const activeWallets = getActiveWallets();

  const chainId = (activeNetwork?.id || '') as ChainId;
  const api = connections[chainId]?.api;
  const connection = connections[chainId]?.connection;
  const accounts = activeWallets?.map((wallet) => (wallet.mainAccounts[0] || wallet.chainAccounts[0])?.accountId) || [];

  useEffect(() => {
    if (!connection) return;

    const isNotDisabled = connection.connectionType !== ConnectionType.DISABLED;
    const isNotError = connection.connectionStatus !== ConnectionStatus.ERROR;

    setIsNetworkActive(isNotDisabled && isNotError);
  }, [connection, isNetworkActive]);

  useEffect(() => {
    if (!chainId || !api?.isConnected || accounts.length === 0) return;

    (async () => {
      await subscribeActiveEra(chainId, api);
      await subscribeLedger(chainId, api, accounts);
    })();
  }, [api, accounts.length]);

  useEffect(() => {
    (async () => {
      const chainsData = await getChainsData();

      const relaychains = sortChains(chainsData).reduce<Option<NetworkOption>[]>((acc, chain) => {
        const asset = chain.assets.find((asset) => asset.staking === StakingType.RELAYCHAIN);
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
      setGraphqlEndpoint(settingsChainId || relaychains[0].id);
    })();
  }, []);

  // TODO: Continue during StakingList task
  // @ts-ignore
  const formattedWallets = (activeWallets || [])?.reduce((acc, wallet) => {
    // TODO: maybe add staking here
    if (!wallet.name.toLowerCase().includes(query.toLowerCase())) return acc;

    const isParentWallet = wallet.parentWalletId === undefined;
    if (isParentWallet) {
      return acc.concat({ name: wallet.name, accountId: wallet.mainAccounts[0]?.accountId });
    }

    const isRelevantDerived = wallet.chainAccounts[0]?.chainId === activeNetwork?.id;
    if (isRelevantDerived) {
      acc.push({ name: wallet.name, accountId: wallet.chainAccounts[0]?.accountId });
    }

    return acc;
  }, [] as { name: string; accountId: AccountID }[]);

  const totalStakes = Object.values(staking).reduce<string[]>((acc, stake) => {
    return acc.concat(stake?.total || '0');
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
              setGraphqlEndpoint(option.id as ChainId);
              setActiveNetwork(option);
            }}
          />
          <TotalAmount
            totalStakes={totalStakes}
            asset={activeNetwork?.value.asset}
            accounts={accounts}
            addressPrefix={activeNetwork?.value.addressPrefix}
          />
        </div>

        {isNetworkActive ? (
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

            <StakingList />
          </>
        ) : (
          <div className="flex flex-col items-center justify-center mt-10 mb-5">
            <Icon as="img" name="noResults" size={380} />
            <p className="text-neutral text-3xl font-bold">{t('staking.overview.networkDisabledLabel')}</p>
            <p className="text-neutral-variant text-base font-normal">
              {t('staking.overview.networkDisabledDescription')}
            </p>
            <ButtonLink className="mt-5" to={Paths.NETWORK} variant="fill" pallet="primary" weight="lg">
              {t('staking.overview.networkSettingsLink')}
            </ButtonLink>
          </div>
        )}
      </div>
    </div>
  );
};

export default Overview;
