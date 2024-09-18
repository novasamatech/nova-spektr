import { useGate } from 'effector-react';

import { useI18n } from '@app/providers';
import { Header } from '@shared/ui';
import { Box, ScrollArea } from '@shared/ui-kit';
import { fellowshipMembersFeature } from '@/features/fellowship-members';
import { fellowshipProfileFeature } from '@/features/fellowship-profile';
import { fellowshipReferendumsFeature } from '@/features/fellowship-referendums';
import { fellowshipPageModel } from '../model/fellowshipPage';

const { MembersCard } = fellowshipMembersFeature.views;
const { ProfileCard } = fellowshipProfileFeature.views;
const { Referendums, Filters, Search } = fellowshipReferendumsFeature.views;

export const Fellowship = () => {
  const { t } = useI18n();
  useGate(fellowshipPageModel.gates.flow);

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
            </div>

            <Filters />

            <Referendums onSelect={console.log} />
          </Box>
        </Box>
      </ScrollArea>
    </div>
  );
};
