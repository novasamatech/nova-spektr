import { useEffect, useState } from 'react';
import { Trans } from 'react-i18next';

import { useSettingsStorage } from '@renderer/services/settings/settingsStorage';
import { AboutStaking, Filter, InfoBanners, StakingList } from './components';
import { Balance, Dropdown, Icon, Input } from '@renderer/components/ui';
import { Option, ResultOption } from '@renderer/components/ui/Dropdowns/common/types';
import { useI18n } from '@renderer/context/I18nContext';
import { useNetworkContext } from '@renderer/context/NetworkContext';
import { Asset, StakingType } from '@renderer/domain/asset';
import { AccountID, ChainId } from '@renderer/domain/shared-kernel';
import { useChains } from '@renderer/services/network/chainsService';
import { useStaking } from '@renderer/services/staking/stakingService';
import { useWallet } from '@renderer/services/wallet/walletService';

const Overview = () => {
  const { t } = useI18n();
  const { connections } = useNetworkContext();
  const { getActiveWallets } = useWallet();
  const { sortChains, getChainsData } = useChains();
  const { subscribeActiveEra, subscribeLedger } = useStaking();
  const { setStakingNetwork, getStakingNetwork } = useSettingsStorage();

  const [query, setQuery] = useState('');
  const [activeNetwork, setActiveNetwork] = useState<ResultOption<Asset>>();
  const [stakingNetworks, setStakingNetworks] = useState<Option<Asset>[]>([]);

  const chainId = (activeNetwork?.id || '') as ChainId;
  const api = connections[chainId]?.api;

  const activeWallets = getActiveWallets();

  useEffect(() => {
    (async () => {
      const chainsData = await getChainsData();

      const relaychains = sortChains(chainsData).reduce((acc, chain) => {
        const asset = chain.assets.find((asset) => asset.staking === StakingType.RELAYCHAIN);
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
    if (!chainId || !api?.isConnected || !activeWallets) return;

    (async () => {
      const accounts = activeWallets.map((wallet) => (wallet.mainAccounts[0] || wallet.chainAccounts[0])?.accountId);
      await subscribeLedger(chainId, api, accounts);
    })();
  }, [activeWallets, api]);

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
      </div>
    </div>
  );
};

export default Overview;
