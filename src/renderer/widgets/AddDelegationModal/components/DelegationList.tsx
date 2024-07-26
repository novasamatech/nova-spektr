import { useUnit } from 'effector-react';

import { useI18n } from '@/app/providers';
import { Loader, SearchInput } from '@/shared/ui';
import { addDelegationModel } from '../model/addDelegation';

import { DelegationCard } from './DelegationCard';
import { EmptyState } from './EmptyState';

export const DelegationList = () => {
  const { t } = useI18n();

  const delegationList = useUnit(addDelegationModel.$delegateList);
  const isListLoading = useUnit(addDelegationModel.$isListLoading);
  const query = useUnit(addDelegationModel.$query);

  return (
    <div className="h-full flex flex-col gap-6">
      <div className="px-5">
        <SearchInput
          value={query}
          placeholder={t('general.input.searchPlaceholder')}
          onChange={addDelegationModel.events.queryChanged}
        />
      </div>

      {isListLoading && (
        <div className="h-full flex items-center justify-center">
          <Loader color="primary" size={25} />
        </div>
      )}

      {!isListLoading && (
        <div className="flex flex-col items-center h-full overflow-y-auto scrollbar-stable">
          <ul className="flex flex-col w-[400px] gap-y-2">
            {delegationList.map((delegate) => (
              <DelegationCard key={delegate.accountId} delegate={delegate} />
            ))}
          </ul>

          {delegationList.length === 0 && <EmptyState />}
        </div>
      )}
    </div>
  );
};
