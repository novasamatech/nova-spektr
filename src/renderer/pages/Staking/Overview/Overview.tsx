import { useState, useEffect, useMemo } from 'react';
import { useNavigate, Outlet } from 'react-router-dom';
import { useUnit } from 'effector-react';

import { Header } from '@renderer/components/common';
import { getRelaychainAsset, toAddress } from '@shared/lib/utils';
import { createLink, type PathType } from '@shared/routes';
import { useGraphql, useI18n, useNetworkContext } from '@app/providers';
import { useToggle } from '@shared/lib/hooks';
import { AboutStaking, NetworkInfo, NominatorsList, Actions, InactiveChain } from './components';
import type { ChainId, Chain, Address, Account, Stake, Validator, ShardAccount } from '@shared/core';
import { ConnectionType, ConnectionStatus } from '@shared/core';
import { accountUtils, walletModel, walletUtils } from '@entities/wallet';
import { priceProviderModel } from '@entities/price';
import { NominatorInfo } from './common/types';
import {
  useEra,
  useStakingData,
  StakingMap,
  ValidatorMap,
  useValidators,
  useStakingRewards,
  ValidatorsModal,
} from '@entities/staking';

export const Overview = () => {
  const { t } = useI18n();
  const activeWallet = useUnit(walletModel.$activeWallet);
  const activeAccounts = useUnit(walletModel.$activeAccounts);

  const navigate = useNavigate();
  const { changeClient } = useGraphql();
  const { connections } = useNetworkContext();

  const { subscribeActiveEra } = useEra();
  const { subscribeStaking } = useStakingData();
  const { getValidatorsList, getNominators } = useValidators();
  const [isShowNominators, toggleNominators] = useToggle();

  const [chainEra, setChainEra] = useState<Record<ChainId, number | undefined>>({});
  const [staking, setStaking] = useState<StakingMap>({});
  const [isStakingLoading, setIsStakingLoading] = useState(true);

  const [validators, setValidators] = useState<ValidatorMap>({});
  const [nominators, setNominators] = useState<Validator[]>([]);

  const [activeChain, setActiveChain] = useState<Chain>();
  const [networkIsActive, setNetworkIsActive] = useState(true);

  const [selectedNominators, setSelectedNominators] = useState<Address[]>([]);
  const [selectedStash, setSelectedStash] = useState<Address>('');

  const chainId = (activeChain?.chainId || '') as ChainId;
  const api = connections[chainId]?.api;
  const connection = connections[chainId]?.connection;
  const addressPrefix = activeChain?.addressPrefix;
  const explorers = activeChain?.explorers;

  const accounts = activeAccounts.reduce<Account[]>((acc, account) => {
    if (accountUtils.isChainIdMatch(account, chainId)) {
      acc.push(account);
    }

    return acc;
  }, []);

  const addresses = accounts.map((a) => toAddress(a.accountId, { prefix: addressPrefix }));

  const { rewards, isRewardsLoading } = useStakingRewards(addresses);

  const isLightClient = connection?.connectionType === ConnectionType.LIGHT_CLIENT;

  useEffect(() => {
    priceProviderModel.events.assetsPricesRequested({ includeRates: true });
  }, []);

  useEffect(() => {
    if (!connection) return;

    const isDisabled = connection.connectionType === ConnectionType.DISABLED;
    const isError = connection.connectionStatus === ConnectionStatus.ERROR;

    setNetworkIsActive(!isDisabled && !isError);
  }, [chainId, connection]);

  useEffect(() => {
    if (!chainId || !api?.isConnected) return;

    let unsubEra: () => void | undefined;
    let unsubStaking: () => void | undefined;

    setIsStakingLoading(true);

    (async () => {
      unsubEra = await subscribeActiveEra(api, (era) => {
        setChainEra({ [chainId]: era });
      });
      unsubStaking = await subscribeStaking(chainId, api, addresses, (staking) => {
        setStaking(staking);
        setIsStakingLoading(false);
      });
    })();

    return () => {
      unsubEra?.();
      unsubStaking?.();
    };
  }, [chainId, api, activeAccounts]);

  useEffect(() => {
    const isMultisig = walletUtils.isMultisig(activeWallet);
    const isNovaWallet = walletUtils.isNovaWallet(activeWallet);
    const isWalletConnect = walletUtils.isWalletConnect(activeWallet);
    const isPolkadotVault = walletUtils.isPolkadotVault(activeWallet);

    if (isMultisig || isNovaWallet || isWalletConnect || isPolkadotVault) {
      setSelectedNominators([addresses[0]]);
    } else {
      setSelectedNominators([]);
    }
  }, [chainId, activeWallet]);

  useEffect(() => {
    if (!chainId || !api?.isConnected) return;

    const era = chainEra[chainId];
    if (!era) return;

    getValidatorsList(api, era).then(setValidators);
  }, [chainId, api, chainEra]);

  useEffect(() => {
    if (!api) return;

    getNominators(api, selectedStash, isLightClient).then((nominators) => {
      setNominators(Object.values(nominators));
    });
  }, [api, selectedStash]);

  const changeNetwork = (chain: Chain) => {
    if (chain.chainId === chainId) return;

    changeClient(chain.chainId);
    setActiveChain(chain);
    setStaking({});
    setSelectedNominators([]);
    setValidators({});
  };

  const openSelectedValidators = async (stash?: Address) => {
    if (!api || !stash) return;

    setSelectedStash(stash);
    toggleNominators();
  };

  const structuredAccounts = walletUtils.isPolkadotVault(activeWallet)
    ? accountUtils.getAccountsAndShardGroups(accounts)
    : accounts;

  const nominatorsInfo = useMemo(() => {
    return structuredAccounts.reduce<(NominatorInfo<ShardAccount>[] | NominatorInfo)[]>((acc, account) => {
      if (accountUtils.isAccountWithShards(account)) {
        const shardGroup = (account as ShardAccount[]).map((shard) => {
          const address = toAddress(shard.accountId, { prefix: addressPrefix });

          return {
            address,
            account: shard,
            stash: staking[address]?.stash,
            isSelected: selectedNominators.includes(address),
            totalStake: isStakingLoading ? undefined : staking[address]?.total || '0',
            totalReward: isRewardsLoading ? undefined : rewards[address],
            unlocking: staking[address]?.unlocking,
          };
        });

        acc.push(shardGroup);
      } else {
        const address = toAddress((account as Account).accountId, { prefix: addressPrefix });
        acc.push({
          address,
          account: account as Account,
          stash: staking[address]?.stash,
          isSelected: selectedNominators.includes(address),
          totalStake: isStakingLoading ? undefined : staking[address]?.total || '0',
          totalReward: isRewardsLoading ? undefined : rewards[address],
          unlocking: staking[address]?.unlocking,
        });
      }

      return acc;
    }, []);
  }, [accounts, addressPrefix, isStakingLoading, isRewardsLoading, staking, selectedNominators]);

  const selectedStakes = selectedNominators.reduce<Stake[]>((acc, address) => {
    const stake = staking[address];
    stake ? acc.push(stake) : acc.push({ address } as Stake);

    return acc;
  }, []);

  const [selectedValidators, notSelectedValidators] = nominators.reduce<[Validator[], Validator[]]>(
    (acc, nominator) => {
      if (validators[nominator.address]) {
        acc[0].push({
          ...nominator,
          ...validators[nominator.address],
        });
      } else {
        acc[1].push(nominator);
      }

      return acc;
    },
    [[], []],
  );

  const navigateToStake = (path: PathType, addresses?: Address[]) => {
    if (addresses) {
      setSelectedNominators(addresses);

      return;
    }

    const accountsMap = accounts.reduce<Record<Address, number>>((acc, account) => {
      if (account.id) {
        acc[toAddress(account.accountId, { prefix: addressPrefix })] = account.id;
      }

      return acc;
    }, {});

    const stakeAccountIds = selectedNominators.map((nominator) => accountsMap[nominator]);

    navigate(createLink(path, { chainId }, { id: stakeAccountIds }));
  };

  const totalStakes = Object.values(staking).map((stake) => stake?.total || '0');
  const relaychainAsset = getRelaychainAsset(activeChain?.assets);

  const toggleSelectedNominators = (address: Address, isAllSelected?: boolean) => {
    const isSelected = isAllSelected === undefined ? selectedNominators.includes(address) : !isAllSelected;

    if (isSelected) {
      setSelectedNominators((value) => value.filter((a) => a !== address));
    } else {
      setSelectedNominators((value) => value.concat(address));
    }
  };

  return (
    <>
      <div className="h-full flex flex-col">
        <Header title={t('staking.title')} />

        <div className="overflow-y-auto w-full h-full mt-6">
          <section className="flex flex-col gap-y-6 mx-auto h-full w-[546px]">
            <NetworkInfo
              rewards={Object.values(rewards)}
              isRewardsLoading={isRewardsLoading}
              isStakingLoading={isStakingLoading}
              totalStakes={totalStakes}
              onNetworkChange={changeNetwork}
            >
              <AboutStaking
                api={api}
                era={chainEra[chainId]}
                validators={Object.values(validators)}
                asset={relaychainAsset}
              />
            </NetworkInfo>

            {networkIsActive && accounts.length > 0 && (
              <>
                <Actions
                  canInteract={!walletUtils.isWatchOnly(activeWallet)}
                  stakes={selectedStakes}
                  isStakingLoading={isStakingLoading}
                  onNavigate={navigateToStake}
                />

                <NominatorsList
                  api={api}
                  era={chainEra[chainId]}
                  nominators={nominatorsInfo}
                  asset={relaychainAsset}
                  explorers={activeChain?.explorers}
                  isStakingLoading={isStakingLoading}
                  addressPrefix={addressPrefix}
                  onCheckValidators={openSelectedValidators}
                  onToggleNominator={toggleSelectedNominators}
                />
              </>
            )}

            {!networkIsActive && <InactiveChain className="flex-grow mb-28" />}
          </section>
        </div>
      </div>

      <ValidatorsModal
        asset={relaychainAsset}
        selectedValidators={selectedValidators}
        notSelectedValidators={notSelectedValidators}
        explorers={explorers}
        isOpen={isShowNominators}
        onClose={toggleNominators}
      />

      <Outlet />
    </>
  );
};
