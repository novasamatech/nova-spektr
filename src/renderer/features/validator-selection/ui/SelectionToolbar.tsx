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

  const { query, signingMode, selectedCount, showSelectedOnly, meta, loading, failed, pending } = useUnit({
    query: validatorSelectionModel.$query,
    signingMode: validatorSelectionModel.$signingMode,
    selectedCount: validatorSelectionModel.$selectedCount,
    showSelectedOnly: validatorSelectionModel.$showSelectedOnly,
    meta: validatorSelectionModel.$meta,
    loading: validatorSelectionModel.$loading,
    failed: validatorSelectionModel.$failed,
    pending: validatorSelectionModel.$pending,
  });

  // The table's own failure panel owns the empty-and-failed state: it says what
  // went wrong and carries the retry. Anything here would either repeat it or —
  // as "0 active validators" did — contradict it.
  const failedEmpty = failed && pending && !loading;
  const failedStale = failed && !pending && !loading;

  // "600 active validators" would be a lie in every state below: while the set
  // is on its way the count is not known yet, and after a failed refresh the
  // number on screen belongs to the previous era.
  const metaLabel = loading
    ? t('staking.validatorSelection.loading.meta')
    : failedEmpty
      ? null
      : failedStale
        ? t('staking.validatorSelection.loadFailed.metaStale')
        : nonNullable(meta.era)
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

      {/* Nothing picked means nothing to show, so the toggle is inert rather
          than able to empty the table. The model turns it back off when the
          last validator is unchecked. */}
      <Button
        variant="chip"
        pallet={showSelectedOnly ? 'primary' : 'secondary'}
        size="sm"
        disabled={selectedCount === 0}
        onClick={() => events.showSelectedOnlyChanged(!showSelectedOnly)}
      >
        {t('staking.validatorSelection.toolbar.showSelected')}
      </Button>

      <Button
        variant="text"
        size="sm"
        disabled={signingMode === 'watchOnly' || selectedCount === 0}
        onClick={() => events.deselectAll()}
      >
        {t('staking.validatorSelection.toolbar.deselectAll')}
      </Button>

      <FootnoteText className="ms-auto shrink-0 text-text-tertiary">{metaLabel}</FootnoteText>

      {failedStale ? (
        <Button variant="text" size="sm" onClick={() => events.retryRequested()}>
          {t('staking.validatorSelection.loadFailed.action')}
        </Button>
      ) : null}
    </div>
  );
};
