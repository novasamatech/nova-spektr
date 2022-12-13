import { useEffect, useState } from 'react';
import { Trans } from 'react-i18next';

import { Balance, ButtonLink, Dropdown, Icon, Input } from '@renderer/components/ui';
import { Option, ResultOption } from '@renderer/components/ui/Dropdowns/common/types';
import { useI18n } from '@renderer/context/I18nContext';
import { useNetworkContext } from '@renderer/context/NetworkContext';
import { Asset, StakingType } from '@renderer/domain/asset';
import { ConnectionStatus, ConnectionType } from '@renderer/domain/connection';
import { AccountID, ChainId } from '@renderer/domain/shared-kernel';
import Paths from '@renderer/routes/paths';
import { useChains } from '@renderer/services/network/chainsService';
import { useSettingsStorage } from '@renderer/services/settings/settingsStorage';
import { useStaking } from '@renderer/services/staking/stakingService';
import { useAccount } from '@renderer/services/account/accountService';
import { AboutStaking, Filter, InfoBanners, StakingList } from './components';

const Overview = () => {
  const { t } = useI18n();
  const { connections } = useNetworkContext();
  const { getActiveAccounts } = useAccount();
  const { sortChains, getChainsData } = useChains();
  const { subscribeActiveEra, subscribeLedger } = useStaking();
  const { setStakingNetwork, getStakingNetwork } = useSettingsStorage();

  const [query, setQuery] = useState('');
  const [isNetworkActive, setIsNetworkActive] = useState(true);
  const [activeNetwork, setActiveNetwork] = useState<ResultOption<Asset>>();
  const [stakingNetworks, setStakingNetworks] = useState<Option<Asset>[]>([]);

  const activeAccounts = getActiveAccounts();

  const chainId = (activeNetwork?.id || '') as ChainId;
  const api = connections[chainId]?.api;
  const connection = connections[chainId]?.connection;

  useEffect(() => {
    if (!connection) return;

    const isNotDisabled = connection.connectionType !== ConnectionType.DISABLED;
    const isNotError = connection.connectionStatus !== ConnectionStatus.ERROR;

    setIsNetworkActive(isNotDisabled && isNotError);
  }, [connection, isNetworkActive]);

  useEffect(() => {
    if (!chainId || !api?.isConnected) return;

    (async () => {
      await subscribeActiveEra(chainId, api);
    })();
  }, [api]);

  useEffect(() => {
    (async () => {
      const chainsData = await getChainsData();

      const relaychains = sortChains(chainsData).reduce((acc, chain) => {
        const asset = chain.assets.find((asset) => asset.staking === StakingType.RELAYCHAIN) as Asset;
        if (!asset) return acc;

        return acc.concat({
          id: chain.chainId,
          value: asset,
          element: (
            <>
              <img src={chain.icon} alt="" width={20} height={20} />
              {chain.name}
            </>
          ),
        });
      }, [] as Option<Asset>[]);

      const settingsChainId = getStakingNetwork();
      const settingsChain = relaychains.find((chain) => chain.id === settingsChainId);

      setStakingNetworks(relaychains);
      setActiveNetwork(settingsChain || { id: relaychains[0].id, value: relaychains[0].value });
    })();
  }, []);

  useEffect(() => {
    if (!chainId || !api?.isConnected) return;

    (async () => {
      await subscribeActiveEra(chainId, api);
    })();
  }, [api]);

  useEffect(() => {
    if (!chainId || !api?.isConnected || !activeAccounts) return;

    (async () => {
      const accounts = activeAccounts.reduce(
        (acc, account) => (account.accountId ? [...acc, account.accountId] : acc),
        [] as string[],
      );
      await subscribeLedger(chainId, api, accounts);
    })();
  }, [activeAccounts, api]);

  // TODO: Continue during StakingList task
  // @ts-ignore
  const formattedWallets = (activeAccounts || [])?.reduce((acc, account) => {
    // TODO: maybe add staking here
    if (!account.name.toLowerCase().includes(query.toLowerCase())) return acc;

    const isRootWallet = account.rootId === undefined;
    if (isRootWallet && account.accountId) {
      return acc.concat({ name: account.name, accountId: account.accountId });
    }

    const isRelevantDerived = account.chainId === activeNetwork?.id;

    if (isRelevantDerived && account.accountId) {
      acc.push({ name: account.name, accountId: account.accountId });
    }

    return acc;
  }, [] as { name: string; accountId: AccountID }[]);

  return (
    <div className="h-full flex flex-col">
      <h1 className="font-semibold text-2xl text-neutral mb-9">{t('staking.title')}</h1>

      <div className="w-[900px] p-5 mx-auto bg-shade-2 rounded-2lg">
        <div className="flex items-center">
          <p className="text-xl text-neutral mr-5">
            <Trans t={t} i18nKey="staking.overview.stakingAssetLabel" values={{ asset: activeNetwork?.value.symbol }} />
          </p>
          <Dropdown
            className="w-40"
            placeholder={t('staking.startStaking.selectNetworkLabel')}
            activeId={activeNetwork?.id}
            options={stakingNetworks}
            onChange={(option) => {
              setStakingNetwork(option.id as ChainId);
              setActiveNetwork(option);
            }}
          />
          <div className="grid grid-flow-row grid-cols-2 gap-x-12.5 ml-auto text-right">
            <p className="uppercase text-shade-40 font-semibold text-xs">{t('staking.overview.totalRewardsLabel')}</p>
            <p className="uppercase text-shade-40 font-semibold text-xs">{t('staking.overview.totalStakedLabel')}</p>
            <Balance
              className="font-semibold text-2xl text-neutral"
              value="103437564986527"
              precision={10}
              symbol={activeNetwork?.value.symbol}
            />
            <Balance
              className="font-semibold text-2xl text-neutral-variant"
              value="103437564986527"
              precision={10}
              symbol={activeNetwork?.value.symbol}
            />
          </div>
        </div>

        {isNetworkActive ? (
          <>
            <AboutStaking asset={activeNetwork?.value} />
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
