import { useEffect } from 'react';
import { useUnit } from 'effector-react';

import { useI18n } from '@app/providers';
import { Header } from '@shared/ui';
import { governancePageModel } from '../model/governance-page-model';
import { governanceModel } from '@entities/governance';
import {
  ReferendumFilter,
  ReferendumDetails,
  LoadingCompleted,
  referendumListModel,
  LoadingOngoing,
  OngoingReferendums,
  CompletedReferendums,
} from '@features/governance';

export const Governance = () => {
  const { t } = useI18n();

  const ongoing = useUnit(governancePageModel.$ongoing);
  const completed = useUnit(governancePageModel.$completed);
  const supportThresholds = useUnit(governanceModel.$supportThresholds);
  const approvalThresholds = useUnit(governanceModel.$approvalThresholds);
  const details = useUnit(referendumListModel.$referendumsDetails);

  useEffect(() => {
    governancePageModel.events.componentMounted();
  }, []);

  return (
    <div className="h-full flex flex-col">
      <Header title={t('governance.title')} titleClass="py-[3px]" headerClass="pt-4 pb-[15px]">
        <ReferendumFilter />
      </Header>

      <div className="overflow-y-auto w-full h-full py-6">
        <section className="flex flex-col h-full w-[736px] mx-auto">
          {/*<div className="flex gap-x-3">*/}
          {/*  <ChainSelector />*/}
          {/*  <Locks onClick={() => console.log('Go to Unlock')} />*/}
          {/*  <Delegations onClick={() => console.log('Go to Delegate')} />*/}
          {/*</div>*/}

          {/* TODO: Tracks - Voted filter */}

          <div className="flex flex-col gap-y-3">
            <LoadingOngoing />
            <LoadingCompleted />

            <OngoingReferendums
              referendums={ongoing}
              details={details}
              supportThresholds={supportThresholds}
              approvalThresholds={approvalThresholds}
              onSelected={governancePageModel.events.referendumSelected}
            />
            <CompletedReferendums
              referendums={completed}
              details={details}
              onSelected={governancePageModel.events.referendumSelected}
            />
          </div>

          {/*<EmptyResults />*/}
          {/*<InactiveNetwork className="flex-grow mb-28" />*/}
        </section>
      </div>

      <ReferendumDetails />
    </div>
  );
};
