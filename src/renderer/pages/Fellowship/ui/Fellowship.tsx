import { useGate } from 'effector-react';

import { useI18n } from '@app/providers';
import { Header } from '@shared/ui';
import { Members } from '@/features/fellowship/memebers/ui/Members';
import { fellowshipPageAggregate } from '../aggregates/fellowshipPage';

export const Fellowship = () => {
  const { t } = useI18n();
  useGate(fellowshipPageAggregate.gates.flow);

  return (
    <div className="flex h-full flex-col">
      <Header title={t('fellowship.title')} titleClass="py-[3px]" headerClass="pt-4 pb-[15px]">
        {/* TODO: Search */}
      </Header>

      <div className="h-full w-full overflow-y-auto py-6">
        <section className="mx-auto flex h-full w-[736px] flex-col">
          <div className="mb-2 flex gap-x-3">
            <Members onClick={() => {}} />
          </div>

          <div className="mb-4 mt-5">{/* TODO: filters */}</div>
        </section>
      </div>
    </div>
  );
};
