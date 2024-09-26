import { useGate, useUnit } from 'effector-react';

import { useI18n } from '@app/providers';
import { type ChainId } from '@/shared/core';
import { FootnoteText, Header, Select } from '@shared/ui';
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

  const network = useUnit(fellowshipNetworkFeature.model.network.$network);

  return (
    <div className="flex h-full flex-col">
      <Header title={t('fellowship.title')} titleClass="py-[3px]" headerClass="pt-4 pb-[15px]">
        <Box direction="row" gap={2} verticalAlign="center">
          {/*TODO remove before release*/}
          {/* eslint-disable-next-line i18next/no-literal-string */}
          <FootnoteText className="text-error">Select network:</FootnoteText>
          <Select
            className="rounded-md border border-error"
            placeholder="Select network"
            selectedId={network?.chainId}
            options={[
              { id: COLLECTIVES_CHAIN_ID, value: COLLECTIVES_CHAIN_ID, element: 'Polkadot People' },
              { id: COLLECTIVES_WESTEND_CHAIN_ID, value: COLLECTIVES_WESTEND_CHAIN_ID, element: 'Test People' },
            ]}
            onChange={(x) => fellowshipNetworkFeature.model.network.selectCollective({ chainId: x.id as ChainId })}
          />
          <Search />
        </Box>
      </Header>

      <ScrollArea>
        <Box horizontalAlign="center" height="100%" padding={[6, 0]}>
          <Box width="736px" height="100%" gap={3}>
            <div className="grid grid-cols-3 gap-3">
              <ProfileCard onClick={() => {}} />
              <MembersCard onClick={() => {}} />
            </div>

            <Filters />

            <Referendums onSelect={console.log} />
          </Box>
        </Box>
      </ScrollArea>
    </div>
  );
};
