import { useGate } from 'effector-react';

import { useI18n } from '@app/providers';
import { Header } from '@shared/ui';
import { Members, Profile, ReferendumFilters, ReferendumSearch } from '@/features/fellowship';
import { fellowshipPageModel } from '../model/fellowshipPage';

export const Fellowship = () => {
  const { t } = useI18n();
  useGate(fellowshipPageModel.gates.flow);

  return (
    <div className="flex h-full flex-col">
      <Header title={t('fellowship.title')} titleClass="py-[3px]" headerClass="pt-4 pb-[15px]">
        <ReferendumSearch />
      </Header>

      <div className="h-full w-full overflow-y-auto py-6">
        <section className="mx-auto flex h-full w-[736px] flex-col">
          <div className="mb-2 flex gap-x-3">
            <Profile onClick={() => {}} />
            <Members onClick={() => {}} />
          </div>

          <div className="mb-4 mt-5">
            <ReferendumFilters />
          </div>
        </section>
      </div>
    </div>
  );
};
