import { useGate, useUnit } from 'effector-react';
import { useEffect, useLayoutEffect } from 'react';
import { Outlet, generatePath, useParams } from 'react-router-dom';

import { type ChainId } from '@/shared/core';
import { useI18n } from '@/shared/i18n';
import { Paths } from '@/shared/routes';
import { Header, Plate } from '@/shared/ui';
import { Box, ScrollArea } from '@/shared/ui-kit';
import { networkModel } from '@/entities/network';
import {
  Locks,
  NetworkSelector,
  Search,
  TotalDelegation,
  delegationAggregate,
  networkSelectorModel,
} from '@/features/governance';
import { navigationModel } from '@/features/navigation';
import { CurrentDelegationModal, currentDelegationModel } from '@/widgets/CurrentDelegationsModal';
import { DelegateDetails } from '@/widgets/DelegateDetails';
import { Delegate } from '@/widgets/DelegateModal';
import { DelegationModal, delegationModel } from '@/widgets/DelegationModal';
import { UnlockModal, unlockAggregate } from '@/widgets/UnlockModal';
import { governancePageAggregate } from '../aggregates/governancePage';

const DEFAULT_GOVERNANCE_CHAIN = '0x91b171bb158e2d3848fa23a9f1c25182fb8e20313b2c1eb49219da7a70ce90c3';

export const Governance = () => {
  useGate(governancePageAggregate.gates.flow);
  const networks = useUnit(networkModel.$chains);

  const { t } = useI18n();

  const { chainId, referendumId } = useParams<'chainId' | 'referendumId'>();

  const selectedChain = useUnit(networkSelectorModel.$governanceChain);

  useEffect(() => {
    if (selectedChain && !referendumId) {
      navigationModel.events.navigateTo(generatePath(Paths.GOVERNANCE_LIST, { chainId: selectedChain.chainId }));
    }
  }, [selectedChain, referendumId]);

  useLayoutEffect(() => {
    const newChain = networks[chainId as ChainId];

    if (chainId && chainId.startsWith('0x') && newChain) {
      networkSelectorModel.events.selectNetwork(newChain);
    } else {
      // navigate to default chain
      navigationModel.events.navigateTo(generatePath(Paths.GOVERNANCE_LIST, { chainId: DEFAULT_GOVERNANCE_CHAIN }));
    }
  }, [chainId]);

  const hasDelegations = useUnit(delegationAggregate.$hasDelegations);

  return (
    <div className="flex h-full flex-col">
      <Header title={t('governance.title')} titleClass="py-[3px]" headerClass="pt-4 pb-[15px]">
        <Search />
      </Header>

      <ScrollArea>
        <Box horizontalAlign="center" height="100%" padding={[6, 0]}>
          <Box width="736px" height="100%" gap={5}>
            <div className="flex gap-x-3">
              <Plate className="h-[90px] w-[240px] px-4 pb-4.5 pt-3">
                <NetworkSelector />
              </Plate>
              <Locks onClick={unlockAggregate.events.flowStarted} />
              <TotalDelegation
                onClick={() =>
                  hasDelegations ? currentDelegationModel.events.flowStarted() : delegationModel.events.flowStarted()
                }
              />
            </div>

            <Outlet />
          </Box>
        </Box>
      </ScrollArea>

      <CurrentDelegationModal />
      <DelegationModal />
      <DelegateDetails />
      <Delegate />

      <UnlockModal />
    </div>
  );
};
