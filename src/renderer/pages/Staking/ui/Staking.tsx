import { useStoreMap, useUnit } from 'effector-react';
import { uniqBy } from 'lodash';
import { useEffect, useMemo, useState } from 'react';

import { type ChainId, type Stake, type Validator } from '@/shared/core';
import { Slot } from '@/shared/di';
import { useI18n } from '@/shared/i18n';
import { useToggle } from '@/shared/lib/hooks';
import { getRelaychainAsset, keys, nonNullable, toAccountId } from '@/shared/lib/utils';
import { type AccountId } from '@/shared/polkadotjs-schemas';
import { Button, EmptyList, Header } from '@/shared/ui';
import { type AnyAccount, identity } from '@/domains/network';
import { type ValidatorMap, eraService, useStakingRewards, validatorsService } from '@/domains/staking';
import { InactiveNetwork, networkModel, useNetworkData } from '@/entities/network';
import { ValidatorsModal } from '@/entities/staking';
import { permissionUtils, walletUtils } from '@/entities/wallet';
import { stakingAccounts } from '@/aggregates/staking-accounts';
import { stakingNetwork } from '@/aggregates/staking-network';
import { walletSelect } from '@/aggregates/wallet-select';
import { EmptyAccountMessage } from '@/features/emptyList';
import { bondExtraModel, bondExtraShardsModel } from '@/features/staking-bond-extra';
import { bondNominateModel, bondNominateModelShards } from '@/features/staking-bond-nominate';
import { nominateModel, nominateShardsModel } from '@/features/staking-nominate';
import { payeeModel, payeeModelShards } from '@/features/staking-payee';
import { restakeModel, restakeModelShards } from '@/features/staking-restake';
import { unstakeModel, unstakeModelShards } from '@/features/staking-unstake';
import { withdrawModel, withdrawShardsModel } from '@/features/staking-withdraw';
import { WalletDetails } from '@/features/wallet-details';
import { type NominatorInfo, Operations as StakeOperations } from '../lib/types';
import {
  stakingBondExtraSlot,
  stakingBondNominateSlot,
  stakingNominateSlot,
  stakingPayeeSlot,
  stakingRestakeSlot,
  stakingUnstakeSlot,
  stakingWithdrawSlot,
} from '../slots';

import { AboutStaking } from './AboutStaking';
import { Actions } from './Actions';
import { NetworkInfo } from './NetworkInfo';
import { NominatorsList } from './NominatorsList';

export const Staking = () => {
  const { t } = useI18n();

  const activeWallet = useUnit(walletSelect.$selectedWallet);
  const chain = useUnit(stakingNetwork.$chain);
  const chainId = useUnit(stakingNetwork.$selectedChainId);
  const api = useUnit(stakingNetwork.$api);
  const networkIsActive = useUnit(stakingNetwork.$networkIsActive);

  const accounts = useUnit(stakingAccounts.$accounts);
  const accountIds = useUnit(stakingAccounts.$accountIds);
  const groupedAccounts = useUnit(stakingAccounts.$groupedAccounts);
  const selectedNominators = useUnit(stakingAccounts.$selectedNominators);
  const isMultipleSelected = useUnit(stakingAccounts.$isMultipleSelected);
  const staking = useUnit(stakingAccounts.$stakingData);
  const isStakingLoading = useUnit(stakingAccounts.$isStakingLoading);

  const [isShowNominators, toggleNominators] = useToggle();
  const [chainEra, setChainEra] = useState<Record<ChainId, number | undefined>>({});
  const [validators, setValidators] = useState<ValidatorMap>({});
  const [nominators, setNominators] = useState<Validator[]>([]);
  const [selectedStash, setSelectedStash] = useState<AccountId | null>(null);
  const [showWalletDetails, setShowWalletDetails] = useState(false);

  const identities = useStoreMap({
    store: identity.$list,
    keys: [chainId],
    fn: (list, [chainId]) => (chainId ? (list[chainId] ?? {}) : {}),
  });

  const timelineChainId = useMemo(() => {
    return chain?.additional?.timelineChain ?? chain?.chainId;
  }, [chain]);
  const { api: timelineApi } = useNetworkData(timelineChainId);

  const chains = useUnit(networkModel.$chains);
  const { data: rewards, pending: isRewardsLoading } = useStakingRewards(accountIds, chain, chains);

  // Initialize network from localStorage
  useEffect(() => {
    stakingNetwork.init();
  }, []);

  // Subscribe to active era
  useEffect(() => {
    if (!chainId || !api?.isConnected) return;

    let unsubEra: () => void | undefined;

    (async () => {
      unsubEra = await eraService.subscribeActiveEra(api, (era) => {
        setChainEra({ [chainId]: era });
      });
    })();

    return () => {
      unsubEra?.();
    };
  }, [chainId, api]);

  // Fetch validators list
  useEffect(() => {
    if (!chainId || !api?.isConnected) return;

    const era = chainEra[chainId];
    if (!era) return;

    validatorsService.getValidatorsList(api, era).then(setValidators);
  }, [chainId, api, chainEra]);

  // Request identities for validators
  useEffect(() => {
    const validatorAccounts = keys(validators).map(toAccountId);

    if (!chainId || validatorAccounts.length === 0) return;

    identity.request({ chainId, accounts: validatorAccounts });
  }, [validators]);

  // Fetch nominators for selected stash
  useEffect(() => {
    if (!api || !selectedStash) return;

    validatorsService.getNominators(api, selectedStash).then((nominators) => {
      setNominators(Object.values(nominators));
    });
  }, [api, selectedStash]);

  const changeNetwork = (nextChainId: ChainId) => {
    if (nextChainId === chainId) return;

    stakingNetwork.selectChain(nextChainId);
    stakingAccounts.resetNominators();
    setValidators({});
  };

  const openSelectedValidators = (stash?: AccountId) => {
    if (!api || !stash) return;

    setSelectedStash(stash);
    toggleNominators();
  };

  const nominatorsInfo = useMemo(() => {
    const getInfo = <T extends AnyAccount>(account: T): NominatorInfo<T> => ({
      account,
      stash: staking[account.accountId]?.stash,
      isSelected: selectedNominators.includes(account.accountId),
      totalStake: isStakingLoading ? undefined : (staking[account.accountId]?.total ?? '0'),
      totalReward: isRewardsLoading ? undefined : rewards[account.accountId],
      unlocking: staking[account.accountId]?.unlocking,
    });

    return groupedAccounts.reduce<NominatorInfo<any>[]>((acc, account) => {
      if (Array.isArray(account)) {
        const shardsGroup = account.map(getInfo);
        // @ts-expect-error TODO fix
        acc.push(shardsGroup);
      } else {
        acc.push(getInfo(account));
      }

      return acc;
    }, []);
  }, [groupedAccounts, isStakingLoading, isRewardsLoading, staking, selectedNominators]);

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

  const totalStakes = Object.values(staking)
    .map((stake) => stake?.total)
    .filter((total): total is string => nonNullable(total));

  const navigateToStake = (operation: StakeOperations, as?: AccountId[]) => {
    if (!chain || !activeWallet) return;

    if (as) {
      stakingAccounts.setSelectedNominators(as);

      return;
    }

    const shards = accounts.filter((account) => selectedNominators.includes(account.accountId));

    const model = {
      [StakeOperations.UNSTAKE]: isMultipleSelected
        ? unstakeModelShards.events.flowStarted
        : unstakeModel.events.flowStarted,
      [StakeOperations.BOND_NOMINATE]: isMultipleSelected
        ? bondNominateModelShards.flowStarted
        : bondNominateModel.flowStarted,
      [StakeOperations.BOND_EXTRA]: isMultipleSelected
        ? bondExtraShardsModel.events.flowStarted
        : bondExtraModel.events.flowStarted,
      [StakeOperations.NOMINATE]: isMultipleSelected
        ? nominateShardsModel.events.flowStarted
        : nominateModel.events.flowStarted,
      [StakeOperations.RESTAKE]: isMultipleSelected
        ? restakeModelShards.events.flowStarted
        : restakeModel.events.flowStarted,
      [StakeOperations.WITHDRAW]: isMultipleSelected
        ? withdrawShardsModel.events.flowStarted
        : withdrawModel.events.flowStarted,
      [StakeOperations.SET_PAYEE]: isMultipleSelected
        ? payeeModelShards.events.flowStarted
        : payeeModel.events.flowStarted,
    };

    model[operation]({
      wallet: activeWallet,
      chain,
      shards: uniqBy(shards, 'accountId'),
    });
  };

  const relaychainAsset = getRelaychainAsset(chain?.assets);

  const toggleSelectedNominators = (id: AccountId, isAllSelected?: boolean) => {
    stakingAccounts.toggleNominator({ id, isAllSelected });
  };

  return (
    <>
      <div className="flex h-full flex-col">
        <Header title={t('staking.title')} />

        <div className="mt-6 h-full w-full overflow-y-auto">
          <section className="mx-auto flex h-full w-[546px] flex-col gap-y-6">
            <NetworkInfo
              chain={chain}
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

            {networkIsActive && accounts.length > 0 && chain && (
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
                  chain={chain}
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
        chain={chain ?? undefined}
        isOpen={isShowNominators}
        onClose={toggleNominators}
      />

      <WalletDetails
        isOpen={showWalletDetails}
        wallet={activeWallet ?? null}
        onClose={() => setShowWalletDetails(false)}
      />

      <Slot id={stakingUnstakeSlot} />
      <Slot id={stakingWithdrawSlot} />
      <Slot id={stakingBondExtraSlot} />
      <Slot id={stakingBondNominateSlot} />
      <Slot id={stakingNominateSlot} />
      <Slot id={stakingRestakeSlot} />
      <Slot id={stakingPayeeSlot} />
    </>
  );
};
