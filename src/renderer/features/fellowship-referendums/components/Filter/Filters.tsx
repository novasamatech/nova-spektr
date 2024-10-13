import { useUnit } from 'effector-react';

import { useI18n } from '@/app/providers';
import { Button, MultiSelect, Select } from '@/shared/ui';
import { Box } from '@/shared/ui-kit';
import { filterModel } from '../../model/filter';

import { voteOptions } from './constants';

export const Filters = () => {
  const { t } = useI18n();
  const tracks = useUnit(filterModel.$tracks);
  const selectedTrackIds = useUnit(filterModel.$selectedTracks);
  const selectedVoteId = useUnit(filterModel.$selectedVotingStatus);
  const query = useUnit(filterModel.$query);
  const isFiltersSelected = useUnit(filterModel.$isFiltersSelected);

  if (query) {
    return null;
  }

  const trackFilterOptions = tracks.map(({ id, name }) => ({
    id: id.toString(),
    value: id,
    element: name.toString(),
  }));

  const voteFilterOptions = voteOptions.map(({ id, value, element }) => ({
    id,
    value,
    element: t(element),
  }));

  return (
    <Box direction="row" gap={4} padding={[4, 0, 2]}>
      <MultiSelect
        className="w-[200px]"
        placeholder={t('governance.filters.tracks')}
        multiPlaceholder={t('governance.filters.tracks')}
        selectedIds={selectedTrackIds.map(x => x.toString())}
        options={trackFilterOptions}
        disabled={tracks.length === 0}
        onChange={value => {
          filterModel.events.selectTracks(value.map(x => x.value));
        }}
      />
      <Select
        className="w-[103px]"
        placeholder={t('governance.filters.vote')}
        selectedId={selectedVoteId ?? ''}
        options={voteFilterOptions}
        onChange={value => {
          filterModel.events.selectVotingStatus(value.value);
        }}
      />
      {Boolean(isFiltersSelected) && (
        <Button variant="text" className="ml-auto h-8.5 py-0" onClick={() => filterModel.events.filtersReset()}>
          {t('operations.filters.clearAll')}
        </Button>
      )}
    </Box>
  );
};
