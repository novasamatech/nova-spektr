import { useStoreMap, useUnit } from 'effector-react';
import { uniqBy } from 'lodash';
import { Suspense, lazy, useEffect, useMemo, useState } from 'react';

import { localStorageService } from '@/shared/api/local-storage';
import { type ChainId, type Stake, type Validator } from '@/shared/core';
import { useI18n } from '@/shared/i18n';
import { useToggle } from '@/shared/lib/hooks';
import { getRelaychainAsset, keys, toAccountId } from '@/shared/lib/utils';
import { type AccountId } from '@/shared/polkadotjs-schemas';
import { Button, EmptyList, Header } from '@/shared/ui';
import { type AnyAccount, accountService, identity } from '@/domains/network';
import { InactiveNetwork, networkModel, networkUtils, useNetworkData } from '@/entities/network';
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
import { accountUtils, permissionUtils, walletUtils } from '@/entities/wallet';
import { walletSelect } from '@/aggregates/wallet-select';
import { EmptyAccountMessage } from '@/features/emptyList';
import { WalletDetails } from '@/features/wallet-details';
import {
  bondExtraModel,
  bondExtraShardsModel,
  bondNominateModel,
  bondNominateModelShards,
  nominateModel,
  nominateShardsModel,
  payeeModel,
  payeeModelShards,
  restakeModel,
  restakeModelShards,
  unstakeModel,
  unstakeModelShards,
  withdrawModel,
  withdrawShardsModel,
} from '@/widgets/Staking';
import { type NominatorInfo, Operations as StakeOperations } from '../lib/types';

import { AboutStaking } from './AboutStaking';
import { Actions } from './Actions';
import { NetworkInfo } from './NetworkInfo';
// TODO: will be much simpler when we refactor staking page
// eslint-disable-next-line import-x/max-dependencies
import { NominatorsList } from './NominatorsList';

// Lazy-loaded components
const LazyUnstake = lazy(() => import('@/widgets/Staking').then(({ Unstake }) => ({ default: Unstake })));
const LazyUnstakeShards = lazy(() =>
  import('@/widgets/Staking').then(({ UnstakeShards }) => ({ default: UnstakeShards })),
);

const LazyBondExtra = lazy(() => import('@/widgets/Staking').then(({ BondExtra }) => ({ default: BondExtra })));
const LazyBondExtraShards = lazy(() =>
  import('@/widgets/Staking').then(({ BondExtraShards }) => ({ default: BondExtraShards })),
);

const LazyNominate = lazy(() => import('@/widgets/Staking').then(({ Nominate }) => ({ default: Nominate })));
const LazyNominateShards = lazy(() =>
  import('@/widgets/Staking').then(({ NominateShards }) => ({ default: NominateShards })),
);

const LazyWithdraw = lazy(() => import('@/widgets/Staking').then(({ Withdraw }) => ({ default: Withdraw })));
const LazyWithdrawShards = lazy(() =>
  import('@/widgets/Staking').then(({ WithdrawShards }) => ({ default: WithdrawShards })),
);

const LazyPayee = lazy(() => import('@/widgets/Staking').then(({ Payee }) => ({ default: Payee })));
const LazyPayeeShards = lazy(() => import('@/widgets/Staking').then(({ PayeeShards }) => ({ default: PayeeShards })));

const LazyBondNominate = lazy(() =>
  import('@/widgets/Staking').then(({ BondNominate }) => ({ default: BondNominate })),
);
const LazyBondNominateShards = lazy(() =>
  import('@/widgets/Staking').then(({ BondNominateShards }) => ({ default: BondNominateShards })),
);

const LazyRestake = lazy(() => import('@/widgets/Staking').then(({ Restake }) => ({ default: Restake })));
const LazyRestakeShards = lazy(() =>
  import('@/widgets/Staking').then(({ RestakeShards }) => ({ default: RestakeShards })),
);

export const Staking = () => {
  const { t } = useI18n();

  const chains = useUnit(networkModel.$chains);
  const activeWallet = useUnit(walletSelect.$selectedWallet);
  const selectedAccounts = useUnit(walletSelect.$selectedAccounts);

  const { subscribeStaking } = useStakingData();
  const [isShowNominators, toggleNominators] = useToggle();

  const [chainEra, setChainEra] = useState<Record<ChainId, number | undefined>>({});
  const [staking, setStaking] = useState<StakingMap>({});
  const [isStakingLoading, setIsStakingLoading] = useState(true);

  const [validators, setValidators] = useState<ValidatorMap>({});
  const [nominators, setNominators] = useState<Validator[]>([]);

  const [chainId, setChainId] = useState<ChainId | null>(null);
  const [networkIsActive, setNetworkIsActive] = useState(true);

  const [selectedNominators, setSelectedNominators] = useState<AccountId[]>([]);
  const [selectedStash, setSelectedStash] = useState<AccountId | null>(null);
  const [showWalletDetails, setShowWalletDetails] = useState(false);

  const identities = useStoreMap({
    store: identity.$list,
    keys: [chainId],
    fn: (list, [chainId]) => (chainId ? list[chainId] : {}),
  });

  const { api, connection, connectionStatus } = useNetworkData(chainId || undefined);

  const activeChain = chainId && chains[chainId] ? chains[chainId] : null;
  const addressPrefix = activeChain?.addressPrefix;

  const timelineChainId = useMemo(() => {
    return activeChain?.additional?.timelineChain ?? activeChain?.chainId;
  }, [activeChain]);
  const { api: timelineApi } = useNetworkData(timelineChainId);

  const accounts = useMemo(() => {
    if (!selectedAccounts.length || !activeChain) return [];

    const isPolkadotVault = walletUtils.isPolkadotVault(activeWallet);

    const filteredAccounts = selectedAccounts.filter((account, _, collection) => {
      const isBaseAccount = accountUtils.isVaultBaseAccount(account);
      const hasManyAccounts = collection.length > 1;

      if (isPolkadotVault && isBaseAccount && hasManyAccounts) {
        return false;
      }

      return accountService.isAccountAvailableOnChain(account, activeChain);
    });

    return uniqBy(filteredAccounts, 'accountId');
  }, [selectedAccounts, activeChain, activeWallet]);

  const accountIds = accounts.map((a) => a.accountId);

  const { rewards, isRewardsLoading } = useStakingRewards(accountIds, activeChain);

  useEffect(() => {
    setChainId(localStorageService.getFromStorage(STAKING_NETWORK, DEFAULT_STAKING_CHAIN));
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
      unsubStaking = await subscribeStaking(chainId, api, accountIds, (staking) => {
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

    // TODO remove this check
    const isMultisig = walletUtils.isMultisig(activeWallet);
    const isNovaWallet = walletUtils.isNovaWallet(activeWallet);
    const isWalletConnect = walletUtils.isWalletConnect(activeWallet);
    const isPolkadotVault = walletUtils.isPolkadotVaultGroup(activeWallet);
    const isPolkadotExtension = walletUtils.isPolkadotExtension(activeWallet);
    const isTalismanExtension = walletUtils.isTalismanExtension(activeWallet);
    const isSubWalletExtension = walletUtils.isSubWalletExtension(activeWallet);
    const isProxied = walletUtils.isProxied(activeWallet);

    if (
      isMultisig ||
      isNovaWallet ||
      isWalletConnect ||
      isProxied ||
      isPolkadotExtension ||
      isTalismanExtension ||
      isSubWalletExtension ||
      (isPolkadotVault && accountIds.length === 1)
    ) {
      setSelectedNominators([accountIds[0]]);
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
    const accounts = keys(validators).map(toAccountId);

    if (!chainId || accounts.length === 0) return;

    identity.request({ chainId, accounts });
  }, [validators]);

  useEffect(() => {
    if (!api || !selectedStash) return;

    validatorsService.getNominators(api, selectedStash).then((nominators) => {
      setNominators(Object.values(nominators));
    });
  }, [api, selectedStash]);

  const changeNetwork = (nextChainId: ChainId) => {
    if (nextChainId === chainId) return;

    setChainId(nextChainId);
    setStaking({});
    setSelectedNominators([]);
    setValidators({});
    localStorageService.saveToStorage(STAKING_NETWORK, nextChainId);
  };

  const openSelectedValidators = (stash?: AccountId) => {
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
    const getInfo = <T extends AnyAccount>(account: T): NominatorInfo<T> => ({
      account,
      stash: staking[account.accountId]?.stash,
      isSelected: selectedNominators.includes(account.accountId),
      totalStake: isStakingLoading ? undefined : staking[account.accountId]?.total || '0',
      totalReward: isRewardsLoading ? undefined : rewards[account.accountId],
      unlocking: staking[account.accountId]?.unlocking,
    });

    return groupedAccounts.reduce<NominatorInfo<any>[]>((acc, account) => {
      if (accountUtils.isAccountWithShards(account)) {
        const shardsGroup = account.map(getInfo);

        // @ts-expect-error TODO fix
        acc.push(shardsGroup);
      } else {
        acc.push(getInfo(account));
      }

      return acc;
    }, []);
  }, [groupedAccounts, addressPrefix, isStakingLoading, isRewardsLoading, staking, selectedNominators]);

  const selectedStakes = selectedNominators.reduce<Stake[]>((acc, accountId) => {
    const stake = staking[accountId];
    acc.push(stake ?? ({ accountId } as Stake));

    return acc;
  }, []);

  const [selectedValidators, notSelectedValidators] = nominators.reduce<[Validator[], Validator[]]>(
    (acc, nominator) => {
      if (validators[nominator.accountId]) {
        acc[0].push({
          ...nominator,
          ...validators[nominator.accountId],
        });
      } else {
        acc[1].push(nominator);
      }

      return acc;
    },
    [[], []],
  );

  const isMultipleAccountsSelected = selectedNominators.length > 1;
  const totalStakes = Object.values(staking).map((stake) => stake?.total || '0');

  const navigateToStake = (operation: StakeOperations, as?: AccountId[]) => {
    if (!activeChain || !activeWallet) return;

    if (as) {
      setSelectedNominators(as);

      return;
    }

    const shards = accounts.filter((account) => selectedNominators.includes(account.accountId));

    const model = {
      [StakeOperations.UNSTAKE]: isMultipleAccountsSelected
        ? unstakeModelShards.events.flowStarted
        : unstakeModel.events.flowStarted,
      [StakeOperations.BOND_NOMINATE]: isMultipleAccountsSelected
        ? bondNominateModelShards.flowStarted
        : bondNominateModel.flowStarted,
      [StakeOperations.BOND_EXTRA]: isMultipleAccountsSelected
        ? bondExtraShardsModel.events.flowStarted
        : bondExtraModel.events.flowStarted,
      [StakeOperations.NOMINATE]: isMultipleAccountsSelected
        ? nominateShardsModel.events.flowStarted
        : nominateModel.events.flowStarted,
      [StakeOperations.RESTAKE]: isMultipleAccountsSelected ? restakeModelShards.flowStarted : restakeModel.flowStarted,
      [StakeOperations.WITHDRAW]: isMultipleAccountsSelected
        ? withdrawShardsModel.events.flowStarted
        : withdrawModel.events.flowStarted,
      [StakeOperations.SET_PAYEE]: isMultipleAccountsSelected
        ? payeeModelShards.events.flowStarted
        : payeeModel.events.flowStarted,
    };

    model[operation]({
      wallet: activeWallet,
      chain: activeChain,
      shards: uniqBy(shards, 'accountId'),
    });
  };

  const relaychainAsset = getRelaychainAsset(activeChain?.assets);

  const toggleSelectedNominators = (id: AccountId, isAllSelected?: boolean) => {
    const isSelected = isAllSelected === undefined ? selectedNominators.includes(id) : !isAllSelected;

    if (isSelected) {
      setSelectedNominators((value) => value.filter((a) => a !== id));
    } else {
      setSelectedNominators((value) => value.concat(id));
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
                timelineApi={timelineApi}
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
                  timelineApi={timelineApi}
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

            <InactiveNetwork active={!networkIsActive} className="mb-28 grow" />
          </section>
        </div>
      </div>

      <ValidatorsModal
        asset={relaychainAsset}
        selectedValidators={selectedValidators}
        notSelectedValidators={notSelectedValidators}
        identities={identities}
        chain={activeChain ?? undefined}
        isOpen={isShowNominators}
        onClose={toggleNominators}
      />

      <WalletDetails
        isOpen={showWalletDetails}
        wallet={activeWallet ?? null}
        onClose={() => setShowWalletDetails(false)}
      />

      <Suspense fallback={null}>
        {isMultipleAccountsSelected ? <LazyBondNominateShards /> : <LazyBondNominate />}
      </Suspense>
      <Suspense fallback={null}>{isMultipleAccountsSelected ? <LazyBondExtraShards /> : <LazyBondExtra />}</Suspense>
      <Suspense fallback={null}>{isMultipleAccountsSelected ? <LazyUnstakeShards /> : <LazyUnstake />}</Suspense>
      <Suspense fallback={null}>{isMultipleAccountsSelected ? <LazyNominateShards /> : <LazyNominate />}</Suspense>
      <Suspense fallback={null}>{isMultipleAccountsSelected ? <LazyRestakeShards /> : <LazyRestake />}</Suspense>
      <Suspense fallback={null}>{isMultipleAccountsSelected ? <LazyWithdrawShards /> : <LazyWithdraw />}</Suspense>
      <Suspense fallback={null}>{isMultipleAccountsSelected ? <LazyPayeeShards /> : <LazyPayee />}</Suspense>
    </>
  );
};
