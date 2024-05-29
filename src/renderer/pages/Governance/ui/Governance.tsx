import { useEffect } from 'react';
import { useUnit } from 'effector-react';

import { useI18n } from '@app/providers';
import { Header } from '@shared/ui';
import { governanceModel } from '../model/governance-model';
import { ReferendumFilter, ReferendumDetails, CompletedReferendums } from '@features/governance';

export const Governance = () => {
  const { t } = useI18n();

  // const ongoing = useUnit(governanceModel.$ongoing);
  const completed = useUnit(governanceModel.$completed);

  useEffect(() => {
    governanceModel.events.componentMounted();
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

          {/*<OngoingReferendums referendums={ongoing} onSelected={governanceModel.events.referendumSelected} />*/}
          <CompletedReferendums referendums={completed} onSelected={governanceModel.events.referendumSelected} />
        </section>
      </div>

      <ReferendumDetails />
    </div>
  );
};
