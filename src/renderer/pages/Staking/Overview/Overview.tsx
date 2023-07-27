import { useState, useEffect } from 'react';
import { useNavigate, Outlet } from 'react-router-dom';

import { Header } from '@renderer/components/common';
import { Chain } from '@renderer/entities/chain';
import { getRelaychainAsset, toAddress } from '@renderer/shared/lib/utils';
import { useGraphql, useI18n, useNetworkContext, PathValue, createLink } from '@renderer/app/providers';
import { ChainId, Address, SigningType } from '@renderer/domain/shared-kernel';
import {
  useEra,
  useStakingData,
  StakingMap,
  ValidatorMap,
  useValidators,
  useStakingRewards,
  Stake,
} from '@renderer/entities/staking';
import { useAccount } from '@renderer/entities/account';
import { useToggle } from '@renderer/shared/lib/hooks';
import { NominatorInfo } from '@renderer/pages/Staking/Overview/components/NominatorsList/NominatorsList';
import { AccountDS } from '@renderer/shared/api/storage';
import { ConnectionType, ConnectionStatus } from '@renderer/domain/connection';
import { AboutStaking, NetworkInfo, NominatorsList, Actions, ValidatorsModal, InactiveChain } from './components';

export const Overview = () => {
  const { t } = useI18n();
  const navigate = useNavigate();
  const { changeClient } = useGraphql();
  const { connections } = useNetworkContext();

  const { subscribeActiveEra } = useEra();
  const { subscribeStaking } = useStakingData();
  const { getValidatorsList } = useValidators();
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
  const rootAccountId = accounts[0]?.accountId;
  const addresses = accounts.map((a) => toAddress(a.accountId, { prefix: addressPrefix }));

  const { rewards, isRewardsLoading } = useStakingRewards(addresses);

  const isLightClient = connection?.connectionType === ConnectionType.LIGHT_CLIENT;

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
  }, [chainId, api, signingType, rootAccountId, addresses.length]);

  useEffect(() => {
    const isMultiShard = signingType === SigningType.PARITY_SIGNER && addresses.length > 1;
    const isSingleShard = signingType === SigningType.PARITY_SIGNER && addresses.length === 1;

    if (signingType === SigningType.WATCH_ONLY || isMultiShard) {
      setSelectedNominators([]);
    } else if (signingType === SigningType.MULTISIG || isSingleShard) {
      setSelectedNominators([addresses[0]]);
    }
  }, [chainId, signingType, rootAccountId, addresses.length]);

  useEffect(() => {
    if (!chainId || !api?.isConnected) return;

    const era = chainEra[chainId];
    if (!era) return;

    getValidatorsList(api, era).then(setValidators);
  }, [chainId, api, chainEra]);

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
      <div className="h-full flex flex-col items-start relative">
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
                  canInteract={signingType !== SigningType.WATCH_ONLY}
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
        api={api}
        asset={relaychainAsset}
        stash={selectedStash}
        validators={validators}
        explorers={explorers}
        isOpen={isShowNominators}
        isLightClient={isLightClient}
        onClose={toggleNominators}
      />

      <Outlet />
    </>
  );
};
