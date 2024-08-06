import { useUnit } from 'effector-react';

import { useI18n } from '@/app/providers';
import { Button, Loader, SearchInput, Select } from '@/shared/ui';
import { SortType } from '../common/constants';
import { addDelegationModel } from '../model/addDelegation';

import { DelegationCard } from './DelegationCard';
import { EmptyState } from './EmptyState';

export const DelegationList = () => {
  const { t } = useI18n();

  const delegationList = useUnit(addDelegationModel.$delegateList);
  const isListLoading = useUnit(addDelegationModel.$isListLoading);
  const query = useUnit(addDelegationModel.$query);
  const sortType = useUnit(addDelegationModel.$sortType);

  const options = [
    {
      id: SortType.DELEGATIONS,
      value: SortType.DELEGATIONS,
      element: t('governance.addDelegation.sort.delegations'),
    },
    {
      id: SortType.VOTES,
      value: SortType.VOTES,
      element: t('governance.addDelegation.sort.votes'),
    },
    {
      id: SortType.VOTED,
      value: SortType.VOTED,
      element: t('governance.addDelegation.sort.voted'),
    },
  ];

  return (
    <div className="h-full flex flex-col">
      {isListLoading ? (
        <div className="h-full flex items-center justify-center">
          <Loader color="primary" size={25} />
        </div>
      ) : (
        <>
          <SearchInput
            wrapperClass="mx-5 mb-4"
            value={query}
            placeholder={t('general.input.searchPlaceholder')}
            onChange={addDelegationModel.events.queryChanged}
          />

          <div className="flex justify-between items-center mx-5 mb-6">
            <Select
              className="w-[152px]"
              placeholder={t('governance.addDelegation.sort.placeholder')}
              selectedId={sortType || undefined}
              options={options}
              onChange={({ value }) => addDelegationModel.events.sortTypeChanged(value)}
            />

            {sortType && (
              <Button className="h-8" variant="text" onClick={() => addDelegationModel.events.sortTypeReset()}>
                {t('operations.filters.clearAll')}
              </Button>
            )}
          </div>

          <div className="flex flex-col items-center h-full overflow-y-auto scrollbar-stable">
            <ul className="flex flex-col w-[400px] gap-y-2">
              {delegationList.map((delegate) => (
                <DelegationCard key={delegate.accountId} delegate={delegate} />
              ))}
            </ul>

            {delegationList.length === 0 && <EmptyState />}
          </div>
        </>
      )}
    </div>
  );
};
