import { useStoreMap, useUnit } from 'effector-react';
import uniqBy from 'lodash/uniqBy';
import { useEffect, useMemo, useState } from 'react';

import { useGraphql } from '@/app/providers';
import { localStorageService } from '@/shared/api/local-storage';
import { type Account, type Address, type ChainId, type Stake, type Validator } from '@/shared/core';
import { useI18n } from '@/shared/i18n';
import { useToggle } from '@/shared/lib/hooks';
import { getRelaychainAsset, toAccountId, toAddress } from '@/shared/lib/utils';
import { type AccountId } from '@/shared/polkadotjs-schemas';
import { Button, EmptyList, Header } from '@/shared/ui';
import { identityDomain } from '@/domains/identity';
import { InactiveNetwork, networkModel, networkUtils, useNetworkData } from '@/entities/network';
import { priceProviderModel } from '@/entities/price';
import {
  DEFAULT_STAKING_CHAIN,
  STAKING_NETWORK,
  type StakingMap,
  type ValidatorMap,
  ValidatorsModal,
  eraService,
  useStakingData,
  useStakingRewards,
  validatorsService,
} from '@/entities/staking';
import { accountUtils, permissionUtils, walletModel, walletUtils } from '@/entities/wallet';
import { EmptyAccountMessage } from '@/features/emptyList';
import { walletDetailsFeature } from '@/features/wallet-details';
import * as Operations from '@/widgets/Staking';
import { type NominatorInfo, Operations as StakeOperations } from '../lib/types';

import { AboutStaking } from './AboutStaking';
import { Actions } from './Actions';
import { NetworkInfo } from './NetworkInfo';
// TODO: will be much simpler when we refactor staking page
// eslint-disable-next-line import-x/max-dependencies
import { NominatorsList } from './NominatorsList';

const {
  views: { WalletDetails },
} = walletDetailsFeature;

export const Staking = () => {
  const { t } = useI18n();

  const chains = useUnit(networkModel.$chains);
  const activeWallet = useUnit(walletModel.$activeWallet);

  const { changeClient } = useGraphql();

  const { subscribeStaking } = useStakingData();
  const [isShowNominators, toggleNominators] = useToggle();

  const [chainEra, setChainEra] = useState<Record<ChainId, number | undefined>>({});
  const [staking, setStaking] = useState<StakingMap>({});
  const [isStakingLoading, setIsStakingLoading] = useState(true);

  const [validators, setValidators] = useState<ValidatorMap>({});
  const [nominators, setNominators] = useState<Validator[]>([]);

  const [chainId, setChainId] = useState<ChainId | null>(null);
  const [networkIsActive, setNetworkIsActive] = useState(true);

  const [selectedNominators, setSelectedNominators] = useState<Address[]>([]);
  const [selectedStash, setSelectedStash] = useState<Address>('');
  const [showWalletDetails, setShowWalletDetails] = useState(false);

  const identities = useStoreMap({
    store: identityDomain.identity.$list,
    keys: [chainId],
    fn: (list, [chainId]) => (chainId ? list[chainId] : {}),
  });

  const { api, connection, connectionStatus } = useNetworkData(chainId || undefined);

  const activeChain = chainId && chains[chainId] ? chains[chainId] : null;
  const addressPrefix = activeChain?.addressPrefix;
  const explorers = activeChain?.explorers;

  const accounts =
    activeWallet?.accounts.filter((account, _, collection) => {
      if (!chainId) return false;

      const isBaseAccount = accountUtils.isVaultBaseAccount(account);
      const isPolkadotVault = walletUtils.isPolkadotVault(activeWallet);
      const hasManyAccounts = collection.length > 1;

      if (isPolkadotVault && isBaseAccount && hasManyAccounts) {
        return false;
      }

      return accountUtils.isChainIdMatch(account, chainId);
    }) || [];

  const addresses = accounts.map((a) => toAddress(a.accountId, { prefix: addressPrefix }));

  const { rewards, isRewardsLoading } = useStakingRewards(addresses);

  useEffect(() => {
    setChainId(localStorageService.getFromStorage(STAKING_NETWORK, DEFAULT_STAKING_CHAIN));
  }, []);

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
    const accounts = Object.keys(validators).map(toAccountId) as AccountId[];

    if (!chainId || accounts.length === 0) return;

    identityDomain.identity.request({ chainId, accounts });
  }, [validators]);

  useEffect(() => {
    if (!api || !selectedStash) return;

    validatorsService.getNominators(api, selectedStash).then((nominators) => {
      setNominators(Object.values(nominators));
    });
  }, [api, selectedStash]);

  const changeNetwork = (chainId: ChainId) => {
    changeClient(chainId);
    setChainId(chainId);
    setStaking({});
    setSelectedNominators([]);
    setValidators({});
    localStorageService.saveToStorage(STAKING_NETWORK, chainId);
  };

  const openSelectedValidators = (stash?: Address) => {
    if (!api || !stash) return;

    setSelectedStash(stash);
    toggleNominators();
  };

  const groupedAccounts = useMemo(() => {
    if (!activeWallet) {
      return [];
    }
    if (!walletUtils.isPolkadotVault(activeWallet)) {
      return accounts;
    }

    return accountUtils.getAccountsAndShardGroups(accounts);
  }, [activeWallet, accounts]);

  const nominatorsInfo = useMemo(() => {
    const getInfo = <T extends Account>(address: Address, account: T): NominatorInfo<T> => ({
      address,
      account,
      stash: staking[address]?.stash,
      isSelected: selectedNominators.includes(address),
      totalStake: isStakingLoading ? undefined : staking[address]?.total || '0',
      totalReward: isRewardsLoading ? undefined : rewards[address],
      unlocking: staking[address]?.unlocking,
    });

    return groupedAccounts.reduce<NominatorInfo<any>[]>((acc, account) => {
      if (accountUtils.isAccountWithShards(account)) {
        const shardsGroup = account.map((shard) => {
          const address = toAddress(shard.accountId, { prefix: addressPrefix });

          return getInfo(address, shard);
        });

        // @ts-expect-error TODO fix
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
    acc.push(stake ?? ({ address } as Stake));

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
      <div className="flex h-full flex-col">
        <Header title={t('staking.title')} />

        <div className="mt-6 h-full w-full overflow-y-auto">
          <section className="mx-auto flex h-full w-[546px] flex-col gap-y-6">
            <NetworkInfo
              chain={activeChain}
              rewards={Object.values(rewards)}
              isRewardsLoading={isRewardsLoading}
              isStakingLoading={isStakingLoading}
              totalStakes={totalStakes}
              onNetworkChange={changeNetwork}
            >
              <AboutStaking
                api={api}
                era={chainId ? chainEra[chainId] : undefined}
                validators={Object.values(validators)}
                asset={relaychainAsset}
              />
            </NetworkInfo>

            {networkIsActive && accounts.length > 0 && activeChain && (
              <>
                <Actions
                  canInteract={!!activeWallet && permissionUtils.canStake(activeWallet)}
                  stakes={selectedStakes}
                  isStakingLoading={isStakingLoading}
                  onNavigate={navigateToStake}
                />

                <NominatorsList
                  api={api}
                  era={chainId ? chainEra[chainId] : undefined}
                  nominators={nominatorsInfo}
                  asset={relaychainAsset}
                  chain={activeChain}
                  isStakingLoading={isStakingLoading}
                  onCheckValidators={openSelectedValidators}
                  onToggleNominator={toggleSelectedNominators}
                />
              </>
            )}

            {networkIsActive && activeWallet && accounts.length === 0 && (
              <EmptyList message={<EmptyAccountMessage walletType={activeWallet.type} />}>
                {walletUtils.isPolkadotVault(activeWallet) && (
                  <Button variant="text" onClick={() => setShowWalletDetails(true)}>
                    {t('emptyState.addNewAccountButton')}
                  </Button>
                )}
              </EmptyList>
            )}

            <InactiveNetwork active={!networkIsActive} className="mb-28 flex-grow" />
          </section>
        </div>
      </div>

      <ValidatorsModal
        asset={relaychainAsset}
        selectedValidators={selectedValidators}
        notSelectedValidators={notSelectedValidators}
        identities={identities}
        explorers={explorers}
        isOpen={isShowNominators}
        onClose={toggleNominators}
      />

      <WalletDetails
        isOpen={showWalletDetails}
        wallet={activeWallet ?? null}
        onClose={() => setShowWalletDetails(false)}
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
