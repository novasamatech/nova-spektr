// import { useEffect, useState } from 'react';
// import { useNavigate } from 'react-router-dom';

import { useState, useEffect } from 'react';

import { Header } from '@renderer/components/common';
import { useI18n } from '@renderer/context/I18nContext';
import { Chain } from '@renderer/domain/chain';
import { AboutStaking, NetworkInfo, StakingList, Actions, NominatorsModal } from './components';
import { getRelaychainAsset } from '@renderer/shared/utils/assets';
import { useGraphql } from '@renderer/context/GraphqlContext';
import { ChainId, Address } from '@renderer/domain/shared-kernel';
import { useNetworkContext } from '@renderer/context/NetworkContext';
import { useEra } from '@renderer/services/staking/eraService';
import { useStakingData } from '@renderer/services/staking/stakingDataService';
import { toAddress } from '@renderer/shared/utils/address';
import { useAccount } from '@renderer/services/account/accountService';
import { StakingMap, ValidatorMap } from '@renderer/services/staking/common/types';
import { useToggle } from '@renderer/shared/hooks';
import { useValidators } from '@renderer/services/staking/validatorsService';
import { Account } from '@renderer/domain/account';
import { useStakingRewards } from '@renderer/services/staking/stakingRewardsService';
import { AccountStakeInfo } from './components/StakingList/StakingList';

const Overview = () => {
  const { t } = useI18n();
  const { changeClient } = useGraphql();
  const { connections } = useNetworkContext();

  const { subscribeActiveEra } = useEra();
  const { subscribeStaking } = useStakingData();
  const { getValidators, getNominators } = useValidators();

  const { getActiveAccounts } = useAccount();

  // const navigate = useNavigate();
  const [isShowNominators, toggleNominators] = useToggle();
  //

  // const { getLiveWallets } = useWallet();
  // const { sortChains, getChainsData } = useChains();
  // const { setStakingNetwork, getStakingNetwork } = useSettingsStorage();
  //
  const [era, setEra] = useState<number>();
  const [staking, setStaking] = useState<StakingMap>({});
  const [validators, setValidators] = useState<ValidatorMap>({});
  const [nominators, setNominators] = useState<ValidatorMap>({});
  //
  // const [networkIsActive, setNetworkIsActive] = useState(true);
  const [activeChain, setActiveChain] = useState<Chain>();

  // const [stakingNetworks, setStakingNetworks] = useState<DropdownOption<NetworkOption>[]>([]);
  // const [selectedAccounts, setSelectedAccounts] = useState<Address[]>([]);
  const [selectedStash, setSelectedStash] = useState<Address>('');
  //
  const chainId = (activeChain?.chainId || '') as ChainId;
  const api = connections[chainId]?.api;
  const addressPrefix = activeChain?.addressPrefix;
  // const explorers = activeChain?.explorers;
  // const { api, explorers, addressPrefix, assets, name } = connections[chainId];
  // const connection = connections[chainId]?.connection;
  // const explorers = connections[chainId]?.explorers;
  //
  const accounts = getActiveAccounts().reduce<Account[]>((acc, a) => {
    const derivationIsCorrect = a.rootId && a.derivationPath && a.chainId === chainId;

    if (!a.rootId || derivationIsCorrect) {
      acc.push(a);
    }

    return acc;
  }, []);

  const addresses = accounts.map((a) => toAddress(a.accountId, { prefix: addressPrefix }));

  const { rewards, isRewardsLoading } = useStakingRewards(addresses);

  // useEffect(() => {
  //   if (!connection) return;
  //
  //   const isNotDisabled = connection.connectionType !== ConnectionType.DISABLED;
  //   const isNotError = connection.connectionStatus !== ConnectionStatus.ERROR;
  //
  //   setNetworkIsActive(isNotDisabled && isNotError);
  // }, [connection, networkIsActive]);
  //
  useEffect(() => {
    if (!chainId || !api?.isConnected || addresses.length === 0) return;

    let unsubEra: () => void | undefined;
    let unsubStaking: () => void | undefined;

    (async () => {
      unsubEra = await subscribeActiveEra(api, setEra);
      unsubStaking = await subscribeStaking(chainId, api, addresses, setStaking);
    })();

    return () => {
      unsubEra?.();
      unsubStaking?.();
    };
  }, [chainId, api, addresses.length]);

  useEffect(() => {
    if (!chainId || !api?.isConnected || !era) return;

    getValidators(chainId, api, era).then(setValidators);
  }, [chainId, api, era]);

  const changeNetwork = (chain: Chain) => {
    changeClient(chain.chainId);
    setActiveChain(chain);
    setStaking({});
    // setStakingNetwork(option.id as ChainId);
    // setSelectedAccounts([]);
    setValidators({});
  };
  //
  const setupNominators = async (stash?: Address) => {
    if (!api || !stash) return;

    const nominators = await getNominators(api, stash);

    setSelectedStash(stash);
    setNominators(nominators);
    toggleNominators();
  };
  //
  // const { watchOnlyAccs, paritySignerAccs } = activeAccounts.reduce<Record<string, Address[]>>(
  //   (acc, account) => {
  //     if (!account.accountId) return acc;
  //
  //     if (account.signingType === SigningType.WATCH_ONLY) {
  //       acc.watchOnlyAccs.push(account.accountId);
  //     } else {
  //       acc.paritySignerAccs.push(account.accountId);
  //     }
  //
  //     return acc;
  //   },
  //   { watchOnlyAccs: [], paritySignerAccs: [] },
  // );
  //
  //
  const accountsStakeInfo = accounts.reduce<AccountStakeInfo[]>((acc, account) => {
    const address = toAddress(account.accountId, { prefix: addressPrefix });

    acc.push({
      address,
      stash: staking[address]?.stash,
      signingType: account.signingType,
      accountName: account.name,
      // accountIsSelected: selectedAccounts.includes(address),
      totalStake: staking[address]?.total || '0',
      totalReward: isRewardsLoading ? undefined : rewards[address],
      unlocking: staking[address]?.unlocking,
    });

    return acc;
  }, []);

  // const selectedStakes = Object.entries(staking).reduce<Stake[]>((acc, [address, stake]) => {
  //   if (!selectedAccounts.includes(address)) return acc;
  //
  //   if (stake) {
  //     acc.push(stake);
  //   } else {
  //     acc.push({ address: address } as Stake);
  //   }
  //
  //   return acc;
  // }, []);

  // const navigateToStake = (path: PathValue, accounts?: Address[]) => {
  //   if (accounts) {
  //     setSelectedAccounts(accounts);
  //
  //     return;
  //   }
  //
  //   const activeAccountIds = activeAccounts.reduce<string[]>((acc, account) => {
  //     if (account.id && account.accountId && selectedAccounts.includes(account.accountId)) {
  //       acc.push(account.id.toString());
  //     }
  //
  //     return acc;
  //   }, []);
  //
  //   navigate(createLink(path, { chainId }, { id: activeAccountIds }));
  // };

  const totalStakes = Object.values(staking).map((stake) => stake?.total || '0');
  const relaychainAsset = getRelaychainAsset(activeChain?.assets);

  return (
    <>
      <div className="h-full flex flex-col items-start relative bg-main-app-background">
        <Header title={t('staking.title')} />

        <section className="overflow-y-auto flex flex-col gap-y-4 mx-auto mt-6 h-full w-[546px]">
          <NetworkInfo
            rewards={Object.values(rewards)}
            isRewardsLoading={isRewardsLoading}
            totalStakes={totalStakes}
            onNetworkChange={changeNetwork}
          >
            <AboutStaking api={api} era={era} validators={Object.values(validators)} asset={relaychainAsset} />
          </NetworkInfo>

          <Actions />

          <StakingList
            api={api}
            era={era}
            stakeInfo={accountsStakeInfo}
            asset={relaychainAsset}
            explorers={activeChain?.explorers}
            onCheckValidators={setupNominators}
          />
        </section>
      </div>

      <NominatorsModal
        stash={selectedStash}
        validators={validators}
        nominators={nominators}
        isOpen={isShowNominators}
        onClose={toggleNominators}
      />
    </>
  );
};

export default Overview;
