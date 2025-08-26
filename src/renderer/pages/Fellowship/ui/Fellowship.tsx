import { useGate, useUnit } from 'effector-react';
import { useLayoutEffect } from 'react';
import { Outlet, generatePath, useParams } from 'react-router-dom';

import { type ChainId } from '@/shared/core';
import { Slot, createSlot } from '@/shared/di';
import { useI18n } from '@/shared/i18n';
import { isDev } from '@/shared/lib/utils';
import { Paths } from '@/shared/routes';
import { Header } from '@/shared/ui';
import { Box, Select } from '@/shared/ui-kit';
import { fellowshipNetwork } from '@/aggregates/fellowship-network';
import { navigationModel } from '@/features/navigation';
import {
  COLLECTIVES_CHAIN_ID,
  COLLECTIVES_NOVASAMA_CHAIN_ID,
  COLLECTIVES_WESTEND_CHAIN_ID,
  fellowshipPageModel,
} from '../model/fellowshipPage';

export const fellowshipSidebarSlot = createSlot();
export const fellowshipContentSlot = createSlot();

export const Fellowship = () => {
  const { t } = useI18n();

  useGate(fellowshipPageModel.gates.flow);

  const { chainId } = useParams<'chainId'>();
  const selectedChain = useUnit(fellowshipNetwork.$selectedChainId);

  useLayoutEffect(() => {
    if (chainId?.startsWith('0x')) {
      fellowshipNetwork.selectCollective({ chainId: chainId as ChainId });
    } else {
      // navigate to default chain
      navigationModel.events.navigateTo(generatePath(Paths.FELLOWSHIP_LIST, { chainId: COLLECTIVES_CHAIN_ID }));
    }
  }, [chainId]);

  return (
    <Box height="100%" width="100%">
      <Header title={t('fellowship.title')} titleClass="py-[3px]" headerClass="pt-4 pb-[15px] shrink-0">
        {isDev() && (
          <Box width="200px">
            {/* TODO remove before release */}
            <Select
              placeholder="Select network"
              value={selectedChain ?? null}
              onChange={(chainId) =>
                navigationModel.events.navigateTo(generatePath(Paths.FELLOWSHIP_LIST, { chainId }))
              }
            >
              {/* eslint-disable i18next/no-literal-string */}
              <Select.Item value={COLLECTIVES_CHAIN_ID}>Polkadot Collectives</Select.Item>
              <Select.Item value={COLLECTIVES_WESTEND_CHAIN_ID}>Westend Collectives</Select.Item>
              <Select.Item value={COLLECTIVES_NOVASAMA_CHAIN_ID}>Novasama Collectives</Select.Item>
              {/* eslint-enable i18next/no-literal-string */}
            </Select>
          </Box>
        )}
      </Header>

      <Box horizontalAlign="center" height="100%" width="100%" padding={[4, 0]}>
        <Box direction="row" gap={2} width="1089px" height="100%">
          <Box width="276px" height="100%" gap={2.5} shrink={0}>
            <Slot id={fellowshipSidebarSlot} />
          </Box>
          <Box width="805px" height="100%" gap={2.5} shrink={0}>
            <Slot id={fellowshipContentSlot} />
          </Box>
        </Box>
        <Outlet />
      </Box>
    </Box>
  );
};
