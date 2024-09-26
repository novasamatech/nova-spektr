import { useGate, useUnit } from 'effector-react';

import { useI18n } from '@app/providers';
import { type ChainId } from '@/shared/core';
import { BodyText, Header, Icon, Select } from '@shared/ui';
import { Box, ScrollArea } from '@shared/ui-kit';
import { fellowshipMembersFeature } from '@/features/fellowship-members';
import { fellowshipProfileFeature } from '@/features/fellowship-profile';
import { fellowshipReferendumsFeature } from '@/features/fellowship-referendums';
import { fellowshipNetworkFeature } from '@features/fellowship-network';
import { COLLECTIVES_CHAIN_ID, COLLECTIVES_WESTEND_CHAIN_ID, fellowshipPageModel } from '../model/fellowshipPage';

const { MembersCard } = fellowshipMembersFeature.views;
const { ProfileCard } = fellowshipProfileFeature.views;
const { Referendums, Filters, Search } = fellowshipReferendumsFeature.views;

export const Fellowship = () => {
  const { t } = useI18n();
  useGate(fellowshipPageModel.gates.flow);

  const selectedChain = useUnit(fellowshipNetworkFeature.model.network.$selectedChainId);

  return (
    <div className="flex h-full flex-col">
      <Header title={t('fellowship.title')} titleClass="py-[3px]" headerClass="pt-4 pb-[15px]">
        <Search />
      </Header>

      <ScrollArea>
        <Box horizontalAlign="center" height="100%" padding={[6, 0]}>
          <Box width="736px" height="100%" gap={3}>
            <div className="grid grid-cols-3 gap-3">
              <ProfileCard onClick={() => {}} />
              <MembersCard onClick={() => {}} />

              {/*TODO remove before release*/}
              <div className="flex flex-col justify-center gap-1 rounded-md border-4 border-alert bg-alert-background-warning px-3">
                {/* eslint-disable-next-line i18next/no-literal-string */}
                <BodyText className="flex items-center gap-1 text-alert">
                  <Icon name="warn" size={12} className="text-inherit" />
                  {/* eslint-disable-next-line i18next/no-literal-string */}
                  <span>DEV MODE</span>
                </BodyText>
                <Select
                  placeholder="Select network"
                  selectedId={selectedChain ?? undefined}
                  options={[
                    { id: COLLECTIVES_CHAIN_ID, value: COLLECTIVES_CHAIN_ID, element: 'Polkadot People' },
                    { id: COLLECTIVES_WESTEND_CHAIN_ID, value: COLLECTIVES_WESTEND_CHAIN_ID, element: 'Test People' },
                  ]}
                  onChange={(x) =>
                    fellowshipNetworkFeature.model.network.selectCollective({ chainId: x.id as ChainId })
                  }
                />
              </div>
            </div>

            <Filters />

            <Referendums onSelect={console.log} />
          </Box>
        </Box>
      </ScrollArea>
    </div>
  );
};
