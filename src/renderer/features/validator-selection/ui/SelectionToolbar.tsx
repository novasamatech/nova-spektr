import { useUnit } from 'effector-react';

import { useI18n } from '@/shared/i18n';
import { nonNullable } from '@/shared/lib/utils';
import { Button, FootnoteText } from '@/shared/ui';
import { SearchInput } from '@/shared/ui-kit';
import { validatorSelectionModel } from '../model/validator-selection-model';

import { FiltersPopover } from './FiltersPopover';
import { RecommendedSplitButton } from './RecommendedSplitButton';

const { events } = validatorSelectionModel;

export const SelectionToolbar = () => {
  const { t } = useI18n();

  const { query, signingMode, selectedCount, meta } = useUnit({
    query: validatorSelectionModel.$query,
    signingMode: validatorSelectionModel.$signingMode,
    selectedCount: validatorSelectionModel.$selectedCount,
    meta: validatorSelectionModel.$meta,
  });

  const metaLabel = nonNullable(meta.era)
    ? t('staking.validatorSelection.toolbar.meta', {
        count: meta.validatorCount,
        era: meta.era.toLocaleString(),
      })
    : t('staking.validatorSelection.toolbar.metaNoEra', { count: meta.validatorCount });

  return (
    <div className="flex items-center gap-x-2 px-5 pb-3">
      <div className="w-[270px] shrink-0">
        <SearchInput
          width="full"
          value={query}
          placeholder={t('staking.validatorSelection.toolbar.searchPlaceholder')}
          onChange={events.queryChanged}
        />
      </div>

      <FiltersPopover />

      <RecommendedSplitButton />

      <Button
        variant="text"
        size="sm"
        disabled={signingMode === 'watchOnly' || selectedCount === 0}
        onClick={() => events.deselectAll()}
      >
        {t('staking.validatorSelection.toolbar.deselectAll')}
      </Button>

      <FootnoteText className="ms-auto shrink-0 text-text-tertiary">{metaLabel}</FootnoteText>
    </div>
  );
};
