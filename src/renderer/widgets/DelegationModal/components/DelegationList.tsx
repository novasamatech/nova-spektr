import { useUnit } from 'effector-react';

import { type DelegateAccount } from '@/shared/api/governance';
import { useI18n } from '@/shared/i18n';
import { Button, Loader } from '@/shared/ui';
import { Box, SearchInput, Select } from '@/shared/ui-kit';
import { SortType } from '../common/constants';
import { delegationModel } from '../model/delegation-model';

import { AddToRegistry } from './AddToRegistry';
import { DelegationCard } from './DelegationCard';
import { EmptyState } from './EmptyState';

type Props = {
  onClick: (delegate: DelegateAccount) => void;
  onAddCustomClick: () => void;
};

export const DelegationList = ({ onClick, onAddCustomClick }: Props) => {
  const { t } = useI18n();

  const query = useUnit(delegationModel.$query);
  const delegationList = useUnit(delegationModel.$delegateList);
  const isListLoading = useUnit(delegationModel.$isListLoading);
  const sortType = useUnit(delegationModel.$sortType);

  return (
    <div className="flex h-full flex-col">
      {isListLoading ? (
        <div className="flex h-full items-center justify-center">
          <Loader color="primary" size={25} />
        </div>
      ) : (
        <>
          <div className="mx-5 mb-4 grid grid-cols-[1fr,auto] items-center gap-x-4">
            <SearchInput
              value={query}
              placeholder={t('general.input.searchPlaceholder')}
              onChange={delegationModel.events.queryChanged}
            />

            <Button pallet="primary" variant="text" onClick={onAddCustomClick}>
              {t('governance.addDelegation.addCustom')}
            </Button>
          </div>

          <div className="mx-5 mb-6 flex items-center justify-between">
            <Box width="152px">
              <Select
                placeholder={t('governance.addDelegation.sort.placeholder')}
                value={sortType}
                onChange={delegationModel.events.sortTypeChanged}
              >
                <Select.Item value={SortType.DELEGATIONS}>{t('governance.addDelegation.sort.delegations')}</Select.Item>
                <Select.Item value={SortType.VOTES}>{t('governance.addDelegation.sort.votes')}</Select.Item>
                <Select.Item value={SortType.VOTED}>{t('governance.addDelegation.sort.voted')}</Select.Item>
              </Select>
            </Box>

            {sortType && (
              <Button className="h-8" variant="text" onClick={() => delegationModel.events.sortTypeReset()}>
                {t('operations.filters.clearAll')}
              </Button>
            )}
          </div>

          <AddToRegistry className="mx-5 mb-6 w-auto" />

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
