import { BN, BN_ZERO } from '@polkadot/util';
import { useEffect, useState } from 'react';
import { Trans } from 'react-i18next';

import { Dropdown, Icon, Input } from '@renderer/components/ui';
import { Option, ResultOption } from '@renderer/components/ui/Dropdowns/common/types';
import { useGraphql } from '@renderer/context/GraphqlContext';
import { useI18n } from '@renderer/context/I18nContext';
import { useNetworkContext } from '@renderer/context/NetworkContext';
import { Asset, StakingType } from '@renderer/domain/asset';
import { ConnectionStatus, ConnectionType } from '@renderer/domain/connection';
import { AccountID, ChainId, SigningType } from '@renderer/domain/shared-kernel';
import useToggle from '@renderer/hooks/useToggle';
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
import { isStringsMatchQuery } from '@renderer/utils/strings';
import { AboutStaking, EmptyFilter, InactiveChain, NoAccounts, StakingTable } from './components';
import { AccountStakeInfo } from './components/StakingTable/StakingTable';
import NominatorsModal, { Nominator } from './components/NominatorsModal/NominatorsModal';

type NetworkOption = { asset: Asset; addressPrefix: number };

const Overview = () => {
  const { t } = useI18n();
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
  const [nominators, setNominators] = useState<Record<string, Nominator[]>>({ elected: [], notElected: [] });

  const [query, setQuery] = useState('');
  const [selectedAccounts, setSelectedAccounts] = useState<AccountID[]>([]);
  const [networkIsActive, setNetworkIsActive] = useState(true);
  const [activeNetwork, setActiveNetwork] = useState<ResultOption<NetworkOption>>();
  const [stakingNetworks, setStakingNetworks] = useState<Option<NetworkOption>[]>([]);
  const [selectedStakes, setSelectedStakes] = useState<AccountID[]>([]);

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

  const onNetworkChange = (option: ResultOption<NetworkOption>) => {
    setStakingNetwork(option.id as ChainId);
    changeClient(option.id as ChainId);
    setActiveNetwork(option);
    setSelectedAccounts([]);
    setStaking({});
    setValidators({});
    setSelectedStakes([]);
    setQuery('');
  };

  const setupNominators = async (stash?: AccountID) => {
    if (!api || !stash) return;

    const nominators = await getNominators(api, stash);

    const preparedNominators = nominators.reduce<Record<string, any[]>>(
      (acc, nominator) => {
        const validator = validators[nominator];
        if (!validator) {
          return {
            elected: acc.elected,
            notElected: acc.notElected.concat({ address: nominator }),
          };
        }

        const { identity, apy } = validator;
        const fullIdentity = identity?.subName
          ? `${identity.parent.name}/${identity.subName}`
          : identity?.parent.name || '';

        const nominated = validator.nominators.reduce((acc, data) => {
          return data.who === stash ? acc.add(new BN(data.value)) : acc;
        }, BN_ZERO);

        acc.elected.push({
          apy,
          address: nominator,
          identity: fullIdentity,
          nominated: nominated.toString(),
        });

        return acc;
      },
      { elected: [], notElected: [] },
    );
    setNominators(preparedNominators);
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
      });
    }

    return acc;
  }, []);

  return (
    <>
      <div className="h-full flex flex-col gap-y-9">
        <h1 className="font-semibold text-2xl text-neutral mt-5 px-5">{t('staking.title')}</h1>

        <div className="overflow-y-auto">
          <section className="w-[900px] p-5 mx-auto bg-shade-2 rounded-2lg">
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
                    selectedStakes={selectedStakes}
                    addressPrefix={activeNetwork?.value.addressPrefix}
                    asset={activeNetwork?.value.asset}
                    explorers={explorers}
                    openValidators={setupNominators}
                    selectStaking={setSelectedStakes}
                  />
                )}
              </>
            )}
            {networkIsActive && !activeAccounts.length && <NoAccounts chainName={connections[chainId]?.name} />}
            {!networkIsActive && <InactiveChain />}
          </section>
        </div>
      </div>

      <NominatorsModal
        isOpen={isNominatorsModalOpen}
        elected={nominators.elected}
        notElected={nominators.notElected}
        explorers={explorers}
        asset={activeNetwork?.value.asset}
        onClose={toggleNominatorsModal}
      />
    </>
  );
};

export default Overview;
