import { useState } from 'react';
import { useGate, useStoreMap, useUnit } from 'effector-react';

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
import { Referendum } from '@shared/core';
import { EmptyGovernance } from './EmptyGovernance';

export const Governance = () => {
  useGate(governancePageModel.gates.governanceFlow);

  const { t } = useI18n();

  const [selectedReferendum, setSelectedReferendum] = useState<Referendum | null>(null);
  const isApiConnected = useUnit(networkSelectorModel.$isApiConnected);
  const isLoading = useUnit(referendumListModel.$isLoading);
  const governanceChain = useUnit(networkSelectorModel.$governanceChain);

  const ongoing = useStoreMap({
    store: governancePageModel.$ongoing,
    keys: [governanceChain],
    fn: (referendums, [chain]) => (chain ? referendums[chain.chainId] ?? {} : {}),
  });

  const completed = useStoreMap({
    store: governancePageModel.$completed,
    keys: [governanceChain],
    fn: (referendums, [chain]) => (chain ? referendums[chain.chainId] ?? {} : {}),
  });

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

            <OngoingReferendums referendums={ongoing} onSelect={setSelectedReferendum} />
            <CompletedReferendums referendums={completed} onSelect={setSelectedReferendum} />
          </div>

          <EmptyGovernance />
          <InactiveNetwork active={!isApiConnected} isLoading={isLoading} className="flex-grow" />
        </section>
      </div>

      {selectedReferendum && governanceChain && (
        <ReferendumDetails
          referendum={selectedReferendum}
          chain={governanceChain}
          onClose={() => setSelectedReferendum(null)}
        />
      )}
    </div>
  );
};
