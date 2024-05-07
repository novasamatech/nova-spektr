import { useState, useEffect, useMemo } from 'react';
import { useUnit } from 'effector-react';
import uniqBy from 'lodash/uniqBy';

import { Header } from '@shared/ui';
import { getRelaychainAsset, toAddress } from '@shared/lib/utils';
import { useGraphql, useI18n } from '@app/providers';
import { useToggle } from '@shared/lib/hooks';
import { accountUtils, permissionUtils, walletModel, walletUtils } from '@entities/wallet';
import { priceProviderModel } from '@entities/price';
import { useNetworkData, networkUtils } from '@entities/network';
import { eraService } from '@entities/staking/api';
import { NetworkInfo } from './NetworkInfo';
import { AboutStaking } from './AboutStaking';
import { Actions } from './Actions';
import { NominatorsList } from './NominatorsList';
import { InactiveChain } from './InactiveChain';
import { NominatorInfo, Operations as StakeOperations } from '../lib/types';
import {
  ChainId,
  Chain,
  Address,
  Stake,
  Validator,
  ShardAccount,
  ChainAccount,
  BaseAccount,
  Account,
} from '@shared/core';
import * as Operations from '@widgets/Staking';
import {
  useStakingData,
  StakingMap,
  ValidatorMap,
  validatorsService,
  useStakingRewards,
  ValidatorsModal,
} from '@entities/staking';

export const Staking = () => {
  const { t } = useI18n();

  const activeWallet = useUnit(walletModel.$activeWallet);

  const { changeClient } = useGraphql();

  const { subscribeStaking } = useStakingData();
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

  const { api, connection, connectionStatus } = useNetworkData(chainId);

  const addressPrefix = activeChain?.addressPrefix;
  const explorers = activeChain?.explorers;

  const accounts =
    activeWallet?.accounts.filter((account, _, collection) => {
      const isBaseAccount = accountUtils.isBaseAccount(account);
      const isPolkadotVault = walletUtils.isPolkadotVault(activeWallet);
      const hasManyAccounts = collection.length > 1;

      if (isPolkadotVault && isBaseAccount && hasManyAccounts) return false;

      return accountUtils.isChainIdMatch(account, chainId);
    }) || [];

  const addresses = accounts.map((a) => toAddress(a.accountId, { prefix: addressPrefix }));

  const { rewards, isRewardsLoading } = useStakingRewards(addresses);

  useEffect(() => {
    priceProviderModel.events.assetsPricesRequested({ includeRates: true });
  }, []);

  useEffect(() => {
    if (!connection) return;

    const isDisabled = networkUtils.isDisabledConnection(connection);
    const isError = networkUtils.isErrorStatus(connectionStatus);

    setNetworkIsActive(!isDisabled && !isError);
  }, [chainId, connection]);

  useEffect(() => {
    if (!chainId || !api?.isConnected) return;

    let unsubEra: () => void | undefined;
    let unsubStaking: () => void | undefined;

    setIsStakingLoading(true);

    (async () => {
      unsubEra = await eraService.subscribeActiveEra(api, (era) => {
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
  }, [chainId, api, activeWallet]);

  useEffect(() => {
    if (!activeWallet) return;

    const isMultisig = walletUtils.isMultisig(activeWallet);
    const isNovaWallet = walletUtils.isNovaWallet(activeWallet);
    const isWalletConnect = walletUtils.isWalletConnect(activeWallet);
    const isPolkadotVault = walletUtils.isPolkadotVaultGroup(activeWallet);
    const isProxied = walletUtils.isProxied(activeWallet);

    if (isMultisig || isNovaWallet || isWalletConnect || isProxied || (isPolkadotVault && addresses.length === 1)) {
      setSelectedNominators([addresses[0]]);
    } else {
      setSelectedNominators([]);
    }
  }, [chainId, activeWallet]);

  useEffect(() => {
    if (!chainId || !api?.isConnected) return;

    const era = chainEra[chainId];
    if (!era) return;

    validatorsService.getValidatorsList(api, era).then(setValidators);
  }, [chainId, api, chainEra]);

  useEffect(() => {
    if (!api || !selectedStash) return;

    validatorsService
      .getNominators(api, selectedStash, networkUtils.isLightClientConnection(connection))
      .then((nominators) => {
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

  const openSelectedValidators = (stash?: Address) => {
    if (!api || !stash) return;

    setSelectedStash(stash);
    toggleNominators();
  };

  const groupedAccounts = useMemo((): Account[] | (ChainAccount | ShardAccount[])[] => {
    if (!activeWallet) return [];
    if (!walletUtils.isPolkadotVault(activeWallet)) return accounts;

    return accountUtils.getAccountsAndShardGroups(accounts);
  }, [activeWallet, accounts]);

  const nominatorsInfo = useMemo(() => {
    const getInfo = <T extends BaseAccount | ShardAccount>(address: Address, account: T): NominatorInfo<T> => ({
      address,
      account,
      stash: staking[address]?.stash,
      isSelected: selectedNominators.includes(address),
      totalStake: isStakingLoading ? undefined : staking[address]?.total || '0',
      totalReward: isRewardsLoading ? undefined : rewards[address],
      unlocking: staking[address]?.unlocking,
    });

    // @ts-ignore
    return groupedAccounts.reduce((acc, account) => {
      if (accountUtils.isAccountWithShards(account)) {
        const shardsGroup = account.map((shard) => {
          const address = toAddress(shard.accountId, { prefix: addressPrefix });

          return getInfo(address, shard);
        });

        acc.push(shardsGroup);
      } else {
        const address = toAddress(account.accountId, { prefix: addressPrefix });
        acc.push(getInfo(address, account));
      }

      return acc;
    }, []);
  }, [groupedAccounts, addressPrefix, isStakingLoading, isRewardsLoading, staking, selectedNominators]);

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

  const navigateToStake = (operation: StakeOperations, addresses?: Address[]) => {
    if (!activeChain || !activeWallet) return;

    if (addresses) {
      setSelectedNominators(addresses);

      return;
    }

    const shards = accounts.filter((account) => {
      const address = toAddress(account.accountId, { prefix: addressPrefix });

      return selectedNominators.includes(address);
    });

    const model = {
      [StakeOperations.BOND_NOMINATE]: Operations.bondNominateModel.events.flowStarted,
      [StakeOperations.BOND_EXTRA]: Operations.bondExtraModel.events.flowStarted,
      [StakeOperations.UNSTAKE]: Operations.unstakeModel.events.flowStarted,
      [StakeOperations.RESTAKE]: Operations.restakeModel.events.flowStarted,
      [StakeOperations.NOMINATE]: Operations.nominateModel.events.flowStarted,
      [StakeOperations.WITHDRAW]: Operations.withdrawModel.events.flowStarted,
      [StakeOperations.SET_PAYEE]: Operations.payeeModel.events.flowStarted,
    };

    model[operation]({
      wallet: activeWallet,
      chain: activeChain,
      shards: uniqBy(shards, 'accountId'),
    });
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
                  canInteract={!!activeWallet && permissionUtils.canStake(activeWallet)}
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

      <Operations.BondNominate />
      <Operations.BondExtra />
      <Operations.Unstake />
      <Operations.Nominate />
      <Operations.Restake />
      <Operations.Withdraw />
      <Operations.Payee />
    </>
  );
};
