import { useState } from 'react';
import { useGate, useUnit } from 'effector-react';

import { useI18n } from '@app/providers';
import { Header, Plate } from '@shared/ui';
import { InactiveNetwork } from '@entities/network';
import { governancePageAggregate } from '@pages/Governance/aggregates/governance-page';
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
} from '@features/governance';
import { Referendum } from '@shared/core';
import { EmptyGovernance } from './EmptyGovernance';

export const Governance = () => {
  useGate(governancePageAggregate.gates.flow);

  const { t } = useI18n();

  const [selectedReferendum, setSelectedReferendum] = useState<Referendum | null>(null);
  const isApiConnected = useUnit(networkSelectorModel.$isApiConnected);
  const governanceChain = useUnit(networkSelectorModel.$governanceChain);
  const isLoading = useUnit(governancePageAggregate.$isLoading);

  const ongoing = useUnit(governancePageAggregate.$ongoing);
  const completed = useUnit(governancePageAggregate.$completed);

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

          <div className="mt-5 mb-4">
            <ReferendumFilters />
          </div>

          <div className="flex flex-col gap-y-3">
            {isLoading ? (
              <>
                <LoadingOngoing />
                <LoadingCompleted />
              </>
            ) : (
              <>
                <OngoingReferendums referendums={ongoing} onSelect={setSelectedReferendum} />
                <CompletedReferendums referendums={completed} onSelect={setSelectedReferendum} />
              </>
            )}
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
