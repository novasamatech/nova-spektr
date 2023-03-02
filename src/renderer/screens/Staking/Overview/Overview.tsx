import { useEffect, useState } from 'react';
import { Trans } from 'react-i18next';
import { useNavigate } from 'react-router-dom';

import { StakingActions } from '@renderer/components/common';
import { Dropdown, Icon, Input } from '@renderer/components/ui';
import { DropdownOption, DropdownResult } from '@renderer/components/ui/Dropdowns/common/types';
import { useGraphql } from '@renderer/context/GraphqlContext';
import { useI18n } from '@renderer/context/I18nContext';
import { useNetworkContext } from '@renderer/context/NetworkContext';
import { Asset, StakingType } from '@renderer/domain/asset';
import { ConnectionStatus, ConnectionType } from '@renderer/domain/connection';
import { AccountID, ChainId, SigningType } from '@renderer/domain/shared-kernel';
import { Stake } from '@renderer/domain/stake';
import { PathValue } from '@renderer/routes/paths';
import { createLink } from '@renderer/routes/utils';
import TotalAmount from '@renderer/screens/Staking/Overview/components/TotalAmount/TotalAmount';
import { useAccount } from '@renderer/services/account/accountService';
import { useChains } from '@renderer/services/network/chainsService';
import { useSettingsStorage } from '@renderer/services/settings/settingsStorage';
import { StakingMap, ValidatorMap } from '@renderer/services/staking/common/types';
import { useEra } from '@renderer/services/staking/eraService';
import { useStakingData } from '@renderer/services/staking/stakingDataService';
import { useStakingRewards } from '@renderer/services/staking/stakingRewardsService';
import { useValidators } from '@renderer/services/staking/validatorsService';
import { useWallet } from '@renderer/services/wallet/walletService';
import { useToggle } from '@renderer/shared/hooks';
import { isStringsMatchQuery } from '@renderer/shared/utils/strings';
import { AboutStaking, EmptyFilter, InactiveChain, NoAccounts, StakingTable } from './components';
import NominatorsModal from './components/NominatorsModal/NominatorsModal';
import { AccountStakeInfo } from './components/StakingTable/StakingTable';

type NetworkOption = { asset: Asset; addressPrefix: number };

const Overview = () => {
  const { t } = useI18n();
  const navigate = useNavigate();
  const [isNominatorsModalOpen, toggleNominatorsModal] = useToggle();

  const { changeClient } = useGraphql();
  const { connections } = useNetworkContext();
  const { getActiveAccounts } = useAccount();
  const { getLiveWallets } = useWallet();
  const { sortChains, getChainsData } = useChains();
  const { subscribeStaking } = useStakingData();
  const { getValidators, getNominators } = useValidators();
  const { subscribeActiveEra } = useEra();
  const { setStakingNetwork, getStakingNetwork } = useSettingsStorage();

  const [era, setEra] = useState<number>();
  const [staking, setStaking] = useState<StakingMap>({});
  const [validators, setValidators] = useState<ValidatorMap>({});
  const [nominators, setNominators] = useState<ValidatorMap>({});

  const [query, setQuery] = useState('');
  const [networkIsActive, setNetworkIsActive] = useState(true);
  const [activeNetwork, setActiveNetwork] = useState<DropdownResult<NetworkOption>>();
  const [stakingNetworks, setStakingNetworks] = useState<DropdownOption<NetworkOption>[]>([]);
  const [selectedAccounts, setSelectedAccounts] = useState<AccountID[]>([]);
  const [selectedStash, setSelectedStash] = useState<AccountID>('');

  const chainId = (activeNetwork?.id || '') as ChainId;
  const api = connections[chainId]?.api;
  const connection = connections[chainId]?.connection;
  const explorers = connections[chainId]?.explorers;

  const activeWallets = getLiveWallets();
  const activeAccounts = getActiveAccounts().filter(({ rootId, derivationPath, chainId: accChainId }) => {
    const derivationIsCorrect = accChainId === chainId && rootId && derivationPath;

    return !rootId || derivationIsCorrect;
  });

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

    setNetworkIsActive(isNotDisabled && isNotError);
  }, [connection, networkIsActive]);

  useEffect(() => {
    if (!api?.isConnected || accountAddresses.length === 0) return;

    let unsubEra: () => void | undefined;
    let unsubStaking: () => void | undefined;

    (async () => {
      unsubEra = await subscribeActiveEra(api, setEra);
      unsubStaking = await subscribeStaking(chainId, api, accountAddresses, setStaking);
    })();

    return () => {
      unsubEra?.();
      unsubStaking?.();
    };
  }, [api, accountAddresses.length]);

  useEffect(() => {
    if (!api?.isConnected || !era) return;

    (async () => {
      const validators = await getValidators(chainId, api, era);

      setValidators(validators);
    })();
  }, [api, era]);

  useEffect(() => {
    (async () => {
      const chainsData = await getChainsData();

      const relaychains = sortChains(chainsData).reduce<DropdownOption<NetworkOption>[]>((acc, chain) => {
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

  const onNetworkChange = (option: DropdownResult<NetworkOption>) => {
    setStakingNetwork(option.id as ChainId);
    changeClient(option.id as ChainId);
    setActiveNetwork(option);
    setSelectedAccounts([]);
    setStaking({});
    setValidators({});
    setQuery('');
  };

  const setupNominators = async (stash?: AccountID) => {
    if (!api || !stash) return;

    const nominators = await getNominators(api, stash);

    setSelectedStash(stash);
    setNominators(nominators);
    toggleNominatorsModal();
  };

  const { watchOnlyAccs, paritySignerAccs } = activeAccounts.reduce<Record<string, AccountID[]>>(
    (acc, account) => {
      if (!account.accountId) return acc;

      if (account.signingType === SigningType.WATCH_ONLY) {
        acc.watchOnlyAccs.push(account.accountId);
      } else {
        acc.paritySignerAccs.push(account.accountId);
      }

      return acc;
    },
    { watchOnlyAccs: [], paritySignerAccs: [] },
  );

  const { rewards, isLoading } = useStakingRewards(
    watchOnlyAccs.concat(paritySignerAccs),
    activeNetwork?.value.addressPrefix,
  );

  const walletNames = activeWallets.reduce<Record<string, string>>((acc, wallet) => {
    return wallet.id ? { ...acc, [wallet.id]: wallet.name } : acc;
  }, {});

  const rootNames = activeAccounts.reduce<Record<AccountID, string>>((acc, account) => {
    const chainOrWatchOnlyAccount = account.rootId || account.signingType === SigningType.WATCH_ONLY;
    if (!account.id || chainOrWatchOnlyAccount) return acc;

    return { ...acc, [account.id.toString()]: account.name };
  }, {});

  const stakingInfo = activeAccounts.reduce<AccountStakeInfo[]>((acc, account) => {
    if (!account.accountId) return acc;

    let walletName = account.walletId ? walletNames[account.walletId.toString()] : '';
    if (account.rootId) {
      //eslint-disable-next-line i18next/no-literal-string
      walletName += `- ${rootNames[account.rootId.toString()]}`;
    }

    if (!query || isStringsMatchQuery(query, [walletName, account.name, account.accountId])) {
      acc.push({
        walletName,
        address: account.accountId,
        stash: staking[account.accountId]?.stash,
        signingType: account.signingType,
        accountName: account.name,
        accountIsSelected: selectedAccounts.includes(account.accountId),
        totalStake: staking[account.accountId]?.total || '0',
        totalReward: isLoading ? undefined : rewards[account.accountId],
        unlocking: staking[account.accountId]?.unlocking,
      });
    }

    return acc;
  }, []);

  const selectedStakes = Object.entries(staking).reduce<Stake[]>((acc, [address, stake]) => {
    if (!selectedAccounts.includes(address)) return acc;

    if (stake) {
      acc.push(stake);
    } else {
      acc.push({ accountId: address } as Stake);
    }

    return acc;
  }, []);

  const navigateToStake = (path: PathValue, accounts?: AccountID[]) => {
    if (accounts) {
      setSelectedAccounts(accounts);

      return;
    }

    const activeAccountIds = activeAccounts.reduce<string[]>((acc, account) => {
      if (account.id && account.accountId && selectedAccounts.includes(account.accountId)) {
        acc.push(account.id.toString());
      }

      return acc;
    }, []);

    navigate(createLink(path, { chainId }, { id: activeAccountIds }));
  };

  return (
    <>
      <div className="h-full flex flex-col gap-y-9 relative">
        <h1 className="font-semibold text-2xl text-neutral mt-5 px-5">{t('staking.title')}</h1>

        <div className="overflow-y-auto">
          <section className="w-[900px] p-5 mx-auto bg-shade-2 rounded-2lg mb-36 last:mb-0">
            <div className="flex items-center mb-5">
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
                onChange={onNetworkChange}
              />
              {networkIsActive && activeAccounts.length > 0 && (
                <TotalAmount
                  totalStakes={totalStakes}
                  asset={activeNetwork?.value.asset}
                  accounts={accountAddresses}
                  addressPrefix={activeNetwork?.value.addressPrefix}
                />
              )}
            </div>

            {networkIsActive && activeAccounts.length > 0 && (
              <>
                <AboutStaking
                  className="mb-5"
                  validators={Object.values(validators)}
                  api={api}
                  era={era}
                  asset={activeNetwork?.value.asset}
                />

                {/*<InfoBanners />*/}

                <div className="flex items-center justify-between">
                  <Input
                    wrapperClass="!bg-shade-5 w-[300px]"
                    placeholder={t('staking.overview.searchPlaceholder')}
                    prefixElement={<Icon name="search" className="w-5 h-5" />}
                    value={query}
                    onChange={(e) => setQuery(e.target.value)}
                  />
                  {/*<Filter />*/}
                </div>

                {query && stakingInfo.length === 0 ? (
                  <EmptyFilter />
                ) : (
                  <StakingTable
                    stakeInfo={stakingInfo}
                    selectedStakes={selectedAccounts}
                    addressPrefix={activeNetwork?.value.addressPrefix}
                    asset={activeNetwork?.value.asset}
                    explorers={explorers}
                    openValidators={setupNominators}
                    selectStaking={setSelectedAccounts}
                    currentEra={era}
                    api={api}
                  />
                )}
              </>
            )}
            {networkIsActive && !activeAccounts.length && <NoAccounts chainName={connections[chainId]?.name} />}
            {!networkIsActive && <InactiveChain />}
          </section>

          <StakingActions
            className="absolute bottom-4 left-1/2 -translate-x-1/2"
            stakes={selectedStakes}
            onNavigate={navigateToStake}
          />
        </div>
      </div>

      <NominatorsModal
        isOpen={isNominatorsModalOpen}
        stash={selectedStash}
        validators={validators}
        nominators={nominators}
        explorers={explorers}
        asset={activeNetwork?.value.asset}
        onClose={toggleNominatorsModal}
      />
    </>
  );
};

export default Overview;
