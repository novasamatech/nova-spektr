import { useEffect } from 'react';

import { useI18n } from '@app/providers';
import { Header } from '@shared/ui';
import { ReferendumList, ReferendumFilter } from '@features/governance';
import { governanceModel } from '../model/governance-model';

export const Governance = () => {
  const { t } = useI18n();

  useEffect(() => {
    governanceModel.events.requestStarted();
  }, []);

  return (
    <section className="h-full flex flex-col">
      <Header title={t('balances.title')} titleClass="py-[3px]" headerClass="pt-4 pb-[15px]">
        <ReferendumFilter />
      </Header>

      {/* TODO: Network - Locked - Delegations */}
      {/* TODO: Tracks - Vote filter */}

      <ReferendumList />
    </section>
  );
};
