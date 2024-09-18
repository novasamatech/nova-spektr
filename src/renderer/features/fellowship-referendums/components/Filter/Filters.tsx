import { useUnit } from 'effector-react';

import { useI18n } from '@app/providers';
import { Button, MultiSelect, Select } from '@shared/ui';
import { Box } from '@shared/ui-kit';
import { filterModel } from '../../model/filter';
import { tracksModel } from '../../model/tracks';

import { voteOptions } from './constants';

export const Filters = () => {
  const { t } = useI18n();
  const tracks = useUnit(tracksModel.$list);
  const selectedTrackIds = useUnit(filterModel.$selectedTracks);
  const selectedVoteId = useUnit(filterModel.$selectedVotingStatus);
  const query = useUnit(filterModel.$query);
  const isFiltersSelected = useUnit(filterModel.$isFiltersSelected);

  if (query) {
    return null;
  }

  return (
    <Box direction="row" gap={4} padding={[4, 0, 2]}>
      <MultiSelect
        className="w-[200px]"
        placeholder={t('governance.filters.tracks')}
        multiPlaceholder={t('governance.filters.tracks')}
        selectedIds={selectedTrackIds.map(x => x.toString())}
        options={tracks.map(({ id, name }) => ({
          id: id.toString(),
          value: id,
          element: name.toString(),
        }))}
        disabled={tracks.length === 0}
        onChange={filterModel.events.selectTracks}
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
        onChange={filterModel.events.selectVotingStatus}
      />
      {Boolean(isFiltersSelected) && (
        <Button variant="text" className="ml-auto h-8.5 py-0" onClick={() => filterModel.events.filtersReset()}>
          {t('operations.filters.clearAll')}
        </Button>
      )}
    </Box>
  );
};
