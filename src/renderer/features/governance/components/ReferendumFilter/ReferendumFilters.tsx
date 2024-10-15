import { useUnit } from 'effector-react';

import { useI18n } from '@/shared/i18n';
import { Button, MultiSelect, Select } from '@/shared/ui';
import { filterModel } from '../../model/filter';

import { trackOptions, voteOptions } from './constants';

export const ReferendumFilters = () => {
  const { t } = useI18n();
  const selectedTrackIds = useUnit(filterModel.$selectedTrackIds);
  const selectedVoteId = useUnit(filterModel.$selectedVoteId);
  const query = useUnit(filterModel.$query);
  const isFiltersSelected = useUnit(filterModel.$isFiltersSelected);

  if (query) {
    return null;
  }

  return (
    <div className="flex gap-x-4">
      <MultiSelect
        className="w-[200px]"
        placeholder={t('governance.filters.tracks')}
        multiPlaceholder={t('governance.filters.tracks')}
        selectedIds={selectedTrackIds}
        options={trackOptions.map(({ id, value }) => ({
          id,
          value,
          element: t(value),
        }))}
        onChange={filterModel.events.selectedTracksChanged}
      />
      <Select
        className="w-[103px]"
        placeholder={t('governance.filters.vote')}
        selectedId={selectedVoteId}
        options={voteOptions.map(({ id, value }) => ({
          id,
          value,
          element: t(value),
        }))}
        onChange={filterModel.events.selectedVoteChanged}
      />
      {Boolean(isFiltersSelected) && (
        <Button variant="text" className="ml-auto h-8.5 py-0" onClick={() => filterModel.events.filtersReset()}>
          {t('operations.filters.clearAll')}
        </Button>
      )}
    </div>
  );
};
