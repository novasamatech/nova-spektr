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
    <div className="flex h-full flex-col">
      {isListLoading ? (
        <div className="flex h-full items-center justify-center">
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

          <div className="mx-5 mb-6 flex items-center justify-between">
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

          <div className="scrollbar-stable flex h-full flex-col items-center overflow-y-auto">
            <ul className="flex w-[400px] flex-col gap-y-2">
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
