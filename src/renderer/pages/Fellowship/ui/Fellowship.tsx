import { useGate, useUnit } from 'effector-react';
import { useLayoutEffect } from 'react';
import { Outlet, generatePath, useParams } from 'react-router-dom';

import { type ChainId } from '@/shared/core';
import { useI18n } from '@/shared/i18n';
import { Paths } from '@/shared/routes';
import { BodyText, Header, Icon } from '@/shared/ui';
import { Box, ScrollArea, Select } from '@/shared/ui-kit';
import { fellowshipMembersFeature } from '@/features/fellowship-members';
import { fellowshipNetworkFeature } from '@/features/fellowship-network';
import { fellowshipProfileFeature } from '@/features/fellowship-profile';
import { fellowshipReferendumsFeature } from '@/features/fellowship-referendums';
import { navigationModel } from '@/features/navigation';
import {
  COLLECTIVES_CHAIN_ID,
  COLLECTIVES_NOVASAMA_CHAIN_ID,
  COLLECTIVES_WESTEND_CHAIN_ID,
  fellowshipPageModel,
} from '../model/fellowshipPage';

const { MembersCard } = fellowshipMembersFeature.views;
const { ProfileCard } = fellowshipProfileFeature.views;
const { Search } = fellowshipReferendumsFeature.views;

export const Fellowship = () => {
  const { t } = useI18n();

  useGate(fellowshipPageModel.gates.flow);

  const { chainId } = useParams<'chainId'>();
  const selectedChain = useUnit(fellowshipNetworkFeature.model.network.$selectedChainId);

  useLayoutEffect(() => {
    if (chainId?.startsWith('0x')) {
      fellowshipNetworkFeature.model.network.selectCollective({ chainId: chainId as ChainId });
    } else {
      // navigate to default chain
      navigationModel.events.navigateTo(generatePath(Paths.FELLOWSHIP_LIST, { chainId: COLLECTIVES_CHAIN_ID }));
    }
  }, [chainId]);

  return (
    <div className="flex h-full flex-col">
      <Header title={t('fellowship.title')} titleClass="py-[3px]" headerClass="pt-4 pb-[15px] shrink-0">
        <div className="w-[230px]">
          <Search />
        </div>
      </Header>

      <ScrollArea>
        <Box horizontalAlign="center" fillContainer padding={[6, 0]}>
          <Box width="736px" gap={5}>
            <div className="grid grid-cols-3 gap-3">
              <ProfileCard />
              <MembersCard onClick={() => {}} />

              {/* TODO remove before release */}
              <div className="flex flex-col justify-center gap-1 rounded-md border-4 border-alert bg-alert-background-warning px-3">
                {/* eslint-disable i18next/no-literal-string */}
                <BodyText className="flex items-center gap-1 text-alert">
                  <Icon name="warn" size={12} className="text-inherit" />
                  <span>DEV MODE</span>
                </BodyText>

                <Select
                  placeholder="Select network"
                  value={selectedChain ?? null}
                  onChange={(chainId) =>
                    navigationModel.events.navigateTo(generatePath(Paths.FELLOWSHIP_LIST, { chainId }))
                  }
                >
                  <Select.Item value={COLLECTIVES_CHAIN_ID}>Polkadot Collectives</Select.Item>
                  <Select.Item value={COLLECTIVES_WESTEND_CHAIN_ID}>Westend Collectives</Select.Item>
                  <Select.Item value={COLLECTIVES_NOVASAMA_CHAIN_ID}>Novasama Collectives</Select.Item>
                </Select>
                {/* eslint-enable i18next/no-literal-string */}
              </div>
            </div>

            <Outlet />
          </Box>
        </Box>
      </ScrollArea>
    </div>
  );
};
