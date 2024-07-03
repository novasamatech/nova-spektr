import { useEffect } from 'react';
import { useUnit } from 'effector-react';

import { useI18n } from '@app/providers';
import { Header, Plate } from '@shared/ui';
import { InactiveNetwork } from '@entities/network';
import { governancePageModel } from '../model/governance-page-model';
import {
  ReferendumSearch,
  ReferendumFilters,
  ReferendumDetails,
  LoadingCompleted,
  LoadingOngoing,
  OngoingReferendums,
  CompletedReferendums,
  NetworkSelector,
  networkSelectorModel,
  referendumListModel,
} from '@features/governance';
import { EmptyGovernance } from './EmptyGovernance';

export const Governance = () => {
  const { t } = useI18n();

  const ongoing = useUnit(governancePageModel.$ongoing);
  const completed = useUnit(governancePageModel.$completed);
  const isApiConnected = useUnit(networkSelectorModel.$isApiConnected);
  const isLoading = useUnit(referendumListModel.$isLoading);

  useEffect(() => {
    governancePageModel.events.flowStarted();
  }, []);

  return (
    <div className="h-full flex flex-col">
      <Header title={t('governance.title')} titleClass="py-[3px]" headerClass="pt-4 pb-[15px]">
        <ReferendumSearch />
      </Header>

      <div className="overflow-y-auto w-full h-full py-6">
        <section className="flex flex-col h-full w-[736px] mx-auto">
          <div className="flex gap-x-3 mb-2">
            <Plate className="w-[240px] h-[90px] pt-3 px-4 pb-4.5">
              <NetworkSelector />
            </Plate>
            {/*<Plate className="w-[240px]">*/}
            {/*  */}
            {/*</Plate>*/}
            {/*<Locks onClick={() => console.log('Go to Unlock')} />*/}
            {/*<Delegations onClick={() => console.log('Go to Delegate')} />*/}
          </div>

          <ReferendumFilters />
          <div className="flex flex-col gap-y-3">
            <LoadingOngoing />
            <LoadingCompleted />

            <OngoingReferendums referendums={ongoing} onSelected={governancePageModel.events.referendumSelected} />
            <CompletedReferendums referendums={completed} onSelected={governancePageModel.events.referendumSelected} />
          </div>

          <EmptyGovernance />
          <InactiveNetwork active={!isApiConnected} isLoading={isLoading} className="flex-grow" />
        </section>
      </div>

      <ReferendumDetails />
    </div>
  );
};
