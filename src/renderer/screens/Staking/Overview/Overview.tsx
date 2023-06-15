import { useState, useEffect } from 'react';
import { useNavigate, Outlet } from 'react-router-dom';

import { Header } from '@renderer/components/common';
import { useI18n } from '@renderer/context/I18nContext';
import { Chain } from '@renderer/domain/chain';
import { getRelaychainAsset } from '@renderer/shared/utils/assets';
import { useGraphql } from '@renderer/context/GraphqlContext';
import { ChainId, Address, SigningType } from '@renderer/domain/shared-kernel';
import { useNetworkContext } from '@renderer/context/NetworkContext';
import { useEra } from '@renderer/services/staking/eraService';
import { useStakingData } from '@renderer/services/staking/stakingDataService';
import { toAddress } from '@renderer/shared/utils/address';
import { useAccount } from '@renderer/services/account/accountService';
import { StakingMap, ValidatorMap } from '@renderer/services/staking/common/types';
import { useToggle } from '@renderer/shared/hooks';
import { useValidators } from '@renderer/services/staking/validatorsService';
import { useStakingRewards } from '@renderer/services/staking/stakingRewardsService';
import { NominatorInfo } from '@renderer/screens/Staking/Overview/components/NominatorsList/NominatorsList';
import { Stake } from '@renderer/domain/stake';
import { PathValue } from '@renderer/routes/paths';
import { createLink } from '@renderer/routes/utils';
import { AccountDS } from '@renderer/services/storage';
import { ConnectionType, ConnectionStatus } from '@renderer/domain/connection';
import {
  AboutStaking,
  NetworkInfo,
  NominatorsList,
  Actions,
  ValidatorsModal,
  NoAccounts,
  InactiveChain,
} from './components';

export const Overview = () => {
  const { t } = useI18n();
  const navigate = useNavigate();
  const { changeClient } = useGraphql();
  const { connections } = useNetworkContext();

  const { subscribeActiveEra } = useEra();
  const { subscribeStaking } = useStakingData();
  const { getValidators } = useValidators();
  const { getActiveAccounts } = useAccount();
  const [isShowNominators, toggleNominators] = useToggle();

  const [chainEra, setChainEra] = useState<Record<ChainId, number | undefined>>({});
  const [staking, setStaking] = useState<StakingMap>({});
  const [isStakingLoading, setIsStakingLoading] = useState(true);
  const [validators, setValidators] = useState<ValidatorMap>({});

  const [activeChain, setActiveChain] = useState<Chain>();
  const [networkIsActive, setNetworkIsActive] = useState(true);

  const [selectedNominators, setSelectedNominators] = useState<Address[]>([]);
  const [selectedStash, setSelectedStash] = useState<Address>('');

  const chainId = (activeChain?.chainId || '') as ChainId;
  const api = connections[chainId]?.api;
  const connection = connections[chainId]?.connection;
  const addressPrefix = activeChain?.addressPrefix;
  const explorers = activeChain?.explorers;

  const accounts = getActiveAccounts().reduce<AccountDS[]>((acc, a) => {
    const derivationIsCorrect = a.rootId && a.derivationPath && a.chainId === chainId;

    if (!a.rootId || derivationIsCorrect) {
      acc.push(a);
    }

    return acc;
  }, []);

  const signingType = accounts[0]?.signingType;
  const addresses = accounts.map((a) => toAddress(a.accountId, { prefix: addressPrefix }));

  const { rewards, isRewardsLoading } = useStakingRewards(addresses);

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
  }, [chainId, api, signingType]);

  useEffect(() => {
    if ([SigningType.WATCH_ONLY, SigningType.PARITY_SIGNER].includes(signingType)) {
      setSelectedNominators([]);
    } else if (signingType === SigningType.MULTISIG && accounts.length === 1) {
      setSelectedNominators([addresses[0]]);
    }
  }, [signingType]);

  useEffect(() => {
    if (!chainId || !api?.isConnected) return;

    const era = chainEra[chainId];
    if (!era) return;

    getValidators(chainId, api, era).then(setValidators);
  }, [chainId, api, chainEra]);

  const changeNetwork = (chain: Chain) => {
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

  const nominatorsInfo = accounts.reduce<NominatorInfo[]>((acc, account) => {
    const address = toAddress(account.accountId, { prefix: addressPrefix });

    acc.push({
      address,
      stash: staking[address]?.stash,
      signingType: account.signingType,
      accountName: account.name,
      isSelected: selectedNominators.includes(address),
      totalStake: isStakingLoading ? undefined : staking[address]?.total || '0',
      totalReward: isRewardsLoading ? undefined : rewards[address],
      unlocking: staking[address]?.unlocking,
    });

    return acc;
  }, []);

  const selectedStakes = selectedNominators.reduce<Stake[]>((acc, address) => {
    const stake = staking[address];
    stake ? acc.push(stake) : acc.push({ address } as Stake);

    return acc;
  }, []);

  const navigateToStake = (path: PathValue, addresses?: Address[]) => {
    if (addresses) {
      setSelectedNominators(addresses);

      return;
    }

    const accountsMap = accounts.reduce<Record<Address, string>>((acc, account) => {
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

  const toggleSelectedNominators = (address: Address) => {
    if (selectedNominators.includes(address)) {
      setSelectedNominators((value) => value.filter((a) => a !== address));
    } else {
      setSelectedNominators((value) => value.concat(address));
    }
  };

  return (
    <>
      <div className="h-full flex flex-col items-start relative bg-main-app-background">
        <Header title={t('staking.title')} />

        <section className="overflow-y-auto flex flex-col gap-y-6 mx-auto mt-6 h-full w-[546px]">
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

          {networkIsActive &&
            (accounts.length > 0 ? (
              <>
                <Actions stakes={selectedStakes} isStakingLoading={isStakingLoading} onNavigate={navigateToStake} />

                <NominatorsList
                  api={api}
                  era={chainEra[chainId]}
                  nominators={nominatorsInfo}
                  asset={relaychainAsset}
                  explorers={activeChain?.explorers}
                  isStakingLoading={isStakingLoading}
                  onCheckValidators={openSelectedValidators}
                  onToggleNominator={toggleSelectedNominators}
                />
              </>
            ) : (
              <NoAccounts className="flex-grow mb-28" />
            ))}

          {!networkIsActive && <InactiveChain className="flex-grow mb-28" />}
        </section>
      </div>

      <ValidatorsModal
        api={api}
        asset={relaychainAsset}
        stash={selectedStash}
        validators={validators}
        explorers={explorers}
        isOpen={isShowNominators}
        onClose={toggleNominators}
      />

      <Outlet />
    </>
  );
};
