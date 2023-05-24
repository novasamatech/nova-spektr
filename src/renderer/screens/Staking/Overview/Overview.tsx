// import { useEffect, useState } from 'react';
// import { useNavigate } from 'react-router-dom';

import { useState, useEffect } from 'react';

import { Header } from '@renderer/components/common';
import { useI18n } from '@renderer/context/I18nContext';
// import { DropdownOption, DropdownResult } from '@renderer/components/ui/Dropdowns/common/types';
// import { useGraphql } from '@renderer/context/GraphqlContext';
// import { useNetworkContext } from '@renderer/context/NetworkContext';
// import { Asset } from '@renderer/domain/asset';
// import { ConnectionStatus, ConnectionType } from '@renderer/domain/connection';
// import { Address, ChainId, SigningType } from '@renderer/domain/shared-kernel';
// import { Stake } from '@renderer/domain/stake';
// import { PathValue } from '@renderer/routes/paths';
// import { createLink } from '@renderer/routes/utils';
// import { useAccount } from '@renderer/services/account/accountService';
// import { useChains } from '@renderer/services/network/chainsService';
// import { useSettingsStorage } from '@renderer/services/settings/settingsStorage';
// import { StakingMap, ValidatorMap } from '@renderer/services/staking/common/types';
// import { useEra } from '@renderer/services/staking/eraService';
// import { useStakingData } from '@renderer/services/staking/stakingDataService';
// import { useStakingRewards } from '@renderer/services/staking/stakingRewardsService';
// import { useValidators } from '@renderer/services/staking/validatorsService';
// import { useWallet } from '@renderer/services/wallet/walletService';
// import { useToggle } from '@renderer/shared/hooks';
// import { isStringsMatchQuery } from '@renderer/shared/utils/strings';
// import NominatorsModal from './components/NominatorsModal/NominatorsModal';
// import { AccountStakeInfo } from './components/StakingList/StakingList';
// import { toAddress } from '@renderer/shared/utils/address';
import { AboutStaking, NetworkInfo, StakingList } from './components';
import { Chain } from '@renderer/domain/chain';
import { getRelaychainAsset } from '@renderer/shared/utils/assets';
import { useGraphql } from '@renderer/context/GraphqlContext';
import { ChainId, Address } from '@renderer/domain/shared-kernel';
import { useNetworkContext } from '@renderer/context/NetworkContext';
import { useEra } from '@renderer/services/staking/eraService';
import { useStakingData } from '@renderer/services/staking/stakingDataService';
import { toAddress } from '@renderer/shared/utils/address';
import { useAccount } from '@renderer/services/account/accountService';
import { StakingMap, ValidatorMap } from '@renderer/services/staking/common/types';
import { useValidators } from '@renderer/services/staking/validatorsService';

const Overview = () => {
  const { t } = useI18n();
  const { changeClient } = useGraphql();
  const { connections } = useNetworkContext();

  const { subscribeActiveEra } = useEra();
  const { subscribeStaking } = useStakingData();
  const { getValidators } = useValidators();

  const { getActiveAccounts } = useAccount();
  // const { api, explorers, addressPrefix, assets, name } = connections[chainId];

  // const navigate = useNavigate();
  // const [isNominatorsModalOpen, toggleNominatorsModal] = useToggle();
  //

  // const { getLiveWallets } = useWallet();
  // const { sortChains, getChainsData } = useChains();
  // const { setStakingNetwork, getStakingNetwork } = useSettingsStorage();
  //
  const [era, setEra] = useState<number>();
  const [staking, setStaking] = useState<StakingMap>({});
  const [validators, setValidators] = useState<ValidatorMap>({});
  // const [nominators, setNominators] = useState<ValidatorMap>({});
  //
  // const [query, setQuery] = useState('');
  // const [networkIsActive, setNetworkIsActive] = useState(true);
  const [activeChain, setActiveChain] = useState<Chain>();

  // const [stakingNetworks, setStakingNetworks] = useState<DropdownOption<NetworkOption>[]>([]);
  // const [selectedAccounts, setSelectedAccounts] = useState<Address[]>([]);
  // const [selectedStash, setSelectedStash] = useState<Address>('');
  //
  const chainId = (activeChain?.chainId || '') as ChainId;
  const api = connections[chainId]?.api;
  const addressPrefix = activeChain?.addressPrefix;
  // const connection = connections[chainId]?.connection;
  // const explorers = connections[chainId]?.explorers;
  //
  // const activeWallets = getLiveWallets();
  const addresses = getActiveAccounts().reduce<Address[]>((acc, a) => {
    const derivationIsCorrect = a.rootId && a.derivationPath && a.chainId === chainId;

    if (!a.rootId || derivationIsCorrect) {
      acc.push(toAddress(a.accountId, { prefix: addressPrefix }));
    }

    return acc;
  }, []);

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
    // setValidators({});
    // setQuery('');
  };
  //
  // const setupNominators = async (stash?: Address) => {
  //   if (!api || !stash) return;
  //
  //   const nominators = await getNominators(api, stash);
  //
  //   setSelectedStash(stash);
  //   setNominators(nominators);
  //   toggleNominatorsModal();
  // };
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
  // const { rewards, isLoading } = useStakingRewards(
  //   watchOnlyAccs.concat(paritySignerAccs),
  //   activeNetwork?.value.addressPrefix,
  // );
  //
  // const walletNames = activeWallets.reduce<Record<string, string>>((acc, wallet) => {
  //   return wallet.id ? { ...acc, [wallet.id]: wallet.name } : acc;
  // }, {});
  //
  // const rootNames = activeAccounts.reduce<Record<Address, string>>((acc, account) => {
  //   const chainOrWatchOnlyAccount = account.rootId || account.signingType === SigningType.WATCH_ONLY;
  //   if (!account.id || chainOrWatchOnlyAccount) return acc;
  //
  //   return { ...acc, [account.id.toString()]: account.name };
  // }, {});
  //
  // const stakingInfo = activeAccounts.reduce<AccountStakeInfo[]>((acc, account) => {
  //   const address = toAddress(account.accountId, { prefix: addressPrefix });
  //   if (!address) return acc;
  //
  //   let walletName = account.walletId ? walletNames[account.walletId.toString()] : '';
  //   if (account.rootId) {
  //     //eslint-disable-next-line i18next/no-literal-string
  //     walletName += `- ${rootNames[account.rootId.toString()]}`;
  //   }
  //
  //   if (!query || isStringsMatchQuery(query, [walletName, account.name, address])) {
  //     acc.push({
  //       walletName,
  //       address,
  //       stash: staking[address]?.stash,
  //       signingType: account.signingType,
  //       accountName: account.name,
  //       accountIsSelected: selectedAccounts.includes(address),
  //       totalStake: staking[address]?.total || '0',
  //       totalReward: isLoading ? undefined : rewards[address],
  //       unlocking: staking[address]?.unlocking,
  //     });
  //   }
  //
  //   return acc;
  // }, []);

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

  return (
    <div className="h-full flex flex-col items-start relative bg-main-app-background">
      <Header title={t('staking.title')} />

      <section className="overflow-y-auto flex flex-col gap-y-4 mx-auto mt-6 h-full w-[546px]">
        <NetworkInfo addresses={addresses} totalStakes={totalStakes} onNetworkChange={changeNetwork}>
          <AboutStaking
            api={api}
            era={era}
            validators={Object.values(validators)}
            asset={getRelaychainAsset(activeChain?.assets)}
          />
        </NetworkInfo>

        <StakingList />
      </section>
    </div>
  );
};

export default Overview;
