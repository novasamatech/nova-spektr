import { useUnit } from 'effector-react';

import { useI18n } from '@/app/providers';
import { type DelegateAccount } from '@/shared/api/governance';
import { Button, Loader, SearchInput, Select } from '@/shared/ui';
import { SortType } from '../common/constants';
import { delegationModel } from '../model/delegation-model';

import { DelegationCard } from './DelegationCard';
import { EmptyState } from './EmptyState';

type Props = {
  onClick: (delegate: DelegateAccount) => void;
  onAddCustomClick: () => void;
};

export const DelegationList = ({ onClick, onAddCustomClick }: Props) => {
  const { t } = useI18n();

  const delegationList = useUnit(delegationModel.$delegateList);
  const isListLoading = useUnit(delegationModel.$isListLoading);
  const query = useUnit(delegationModel.$query);
  const sortType = useUnit(delegationModel.$sortType);

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
          <div className="mx-5 mb-4 flex items-center gap-4">
            <SearchInput
              wrapperClass="flex-1"
              value={query}
              placeholder={t('general.input.searchPlaceholder')}
              onChange={delegationModel.events.queryChanged}
            />

            <Button pallet="primary" variant="text" onClick={onAddCustomClick}>
              {t('governance.addDelegation.addCustom')}
            </Button>
          </div>

          <div className="mx-5 mb-6 flex items-center justify-between">
            <Select
              className="w-[152px]"
              placeholder={t('governance.addDelegation.sort.placeholder')}
              selectedId={sortType || undefined}
              options={options}
              onChange={({ value }) => delegationModel.events.sortTypeChanged(value)}
            />

            {sortType && (
              <Button className="h-8" variant="text" onClick={() => delegationModel.events.sortTypeReset()}>
                {t('operations.filters.clearAll')}
              </Button>
            )}
          </div>

          <div className="scrollbar-stable flex h-full flex-col items-center overflow-y-auto">
            <ul className="flex w-[400px] flex-col gap-y-2">
              {delegationList.map((delegate) => (
                <button key={delegate.accountId} onClick={() => onClick(delegate)}>
                  <DelegationCard key={delegate.accountId} delegate={delegate} />
                </button>
              ))}
            </ul>

            {delegationList.length === 0 && <EmptyState />}
          </div>
        </>
      )}
    </div>
  );
};
