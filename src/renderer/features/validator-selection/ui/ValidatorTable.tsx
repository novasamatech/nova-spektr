import { useUnit } from 'effector-react';
import { useMemo } from 'react';

import { useI18n } from '@/shared/i18n';
import { cnTw, nonNullable, nullable } from '@/shared/lib/utils';
import { Button, Icon } from '@/shared/ui';
import { Account, AssetBalance } from '@/shared/ui-entities';
import {
  type Column,
  type TableSort,
  Checkbox,
  EmptyMessage,
  ScrollArea,
  Skeleton,
  Table,
  Tooltip,
} from '@/shared/ui-kit';
import { type EraValidator } from '@/domains/staking';
import {
  type ScoreTone,
  type SortColumn,
  getDisplayedLabel,
  getScoreTone,
  getValidatorFlag,
  toScoreOutOfTen,
} from '../lib';
import { validatorSelectionModel } from '../model/validator-selection-model';

import { ValidatorFlagBadge } from './ValidatorFlagBadge';

const { events } = validatorSelectionModel;

/** What a cell shows when the chain reported nothing for it. */
const UNKNOWN_VALUE = '—';

const SKELETON_ROW_COUNT = 8;

/**
 * Grey / amber / green, matching the detail pane. Grey is deliberate at the
 * bottom: a low score means "there are better validators this era", not "this
 * one is unsafe" - the unsafe things carry their own badge.
 */
const SCORE_TONE_CLASS: Record<ScoreTone, string> = {
  neutral: 'text-text-tertiary',
  warning: 'text-text-warning',
  positive: 'text-text-positive',
};

const SORT_COLUMNS: SortColumn[] = ['validator', 'score', 'eraPoints', 'nominators', 'ownStake', 'commission', 'apy'];

function isSortColumn(value: string): value is SortColumn {
  return SORT_COLUMNS.some((column) => column === value);
}

/**
 * One field per column, because `Column.key` addresses the row by key - and the
 * table's own sort ids therefore line up with `SortColumn` without a mapping
 * table in between. `validator === null` is a placeholder row rendered while
 * the elected set is still loading; it keeps the header and the column widths
 * in place so nothing jumps when the data lands.
 */
type ValidatorRow = {
  rowKey: string;
  selection: EraValidator | null;
  validator: EraValidator | null;
  /** Composite recommendation score, `0..1`. */
  score: number | null;
  eraPoints: number | null;
  nominators: number | null;
  ownStake: string | null;
  commission: number | null;
  apy: number | null;
};

const SKELETON_ROWS: ValidatorRow[] = Array.from({ length: SKELETON_ROW_COUNT }, (_, index) => ({
  rowKey: `skeleton-${index}`,
  selection: null,
  validator: null,
  score: null,
  eraPoints: null,
  nominators: null,
  ownStake: null,
  commission: null,
  apy: null,
}));

function toRow(validator: EraValidator, score: number | null): ValidatorRow {
  return {
    rowKey: validator.accountId,
    selection: validator,
    validator,
    score,
    eraPoints: validator.eraPoints,
    nominators: validator.nominatorCount,
    ownStake: validator.ownStake,
    commission: validator.commission,
    apy: validator.apy,
  };
}

export const ValidatorTable = () => {
  const { t } = useI18n();

  const {
    chain,
    asset,
    pending,
    visible,
    sort,
    selected,
    selectedCount,
    maxNominations,
    signingMode,
    nominatedIds,
    clusterPositions,
    displayedNames,
    displayedAddresses,
    detailValidator,
    scores,
  } = useUnit({
    chain: validatorSelectionModel.$chain,
    asset: validatorSelectionModel.$asset,
    pending: validatorSelectionModel.$pending,
    visible: validatorSelectionModel.$visibleValidators,
    sort: validatorSelectionModel.$sort,
    selected: validatorSelectionModel.$selected,
    selectedCount: validatorSelectionModel.$selectedCount,
    maxNominations: validatorSelectionModel.$maxNominations,
    signingMode: validatorSelectionModel.$signingMode,
    nominatedIds: validatorSelectionModel.$nominatedIds,
    clusterPositions: validatorSelectionModel.$clusterPositions,
    displayedNames: validatorSelectionModel.$displayedNames,
    displayedAddresses: validatorSelectionModel.$displayedAddresses,
    detailValidator: validatorSelectionModel.$detailValidator,
    scores: validatorSelectionModel.$scores,
  });

  const selectedSet = useMemo(() => new Set(selected), [selected]);
  const nominatedSet = useMemo(() => new Set(nominatedIds), [nominatedIds]);
  const displayed = useMemo(
    () => ({ names: displayedNames, addresses: displayedAddresses }),
    [displayedNames, displayedAddresses],
  );

  const rows = useMemo(
    () =>
      pending
        ? SKELETON_ROWS
        : visible.map((validator) => toRow(validator, scores[validator.accountId]?.overall ?? null)),
    [pending, visible, scores],
  );

  const isReadOnly = signingMode === 'watchOnly';
  const atLimit = selectedCount >= maxNominations;

  const columns = useMemo<Column<ValidatorRow>[]>(() => {
    const numericTitle = (text: string) => <span className="ms-auto">{text}</span>;

    return [
      {
        key: 'selection',
        title: '',
        width: '48px',
        render: (_, row) => {
          const validator = row.selection;
          if (nullable(validator)) return <Skeleton width="16px" height="16px" />;

          if (isReadOnly) {
            return nominatedSet.has(validator.accountId) ? (
              <Icon name="checkmark" size={16} className="text-text-positive" />
            ) : null;
          }

          const checked = selectedSet.has(validator.accountId);

          const checkbox = (
            <Checkbox
              checked={checked}
              // Unchecking is never blocked - see the toggle guard in the model.
              disabled={!checked && (validator.blocked || atLimit)}
              onChange={() => events.validatorToggled(validator)}
              onClick={(event) => event.stopPropagation()}
            />
          );

          // A blocked validator is the one case where the box can never be
          // ticked no matter what the user does, so it says why on hover
          // instead of being an inert square. The wrapper is what carries the
          // hover - `Checkbox` renders a label around a disabled Radix button,
          // and neither of those emits pointer events of its own. Clicking it
          // stays a no-op (the browser swallows a click on a label whose control
          // is disabled); the rest of the row is the way into the details.
          //
          // Not when it is already ticked: a validator can turn blocked after it
          // was nominated, and that box still un-ticks, so "cannot be picked"
          // would be the wrong thing to say over a control that works.
          if (!validator.blocked || checked) return checkbox;

          return (
            <Tooltip>
              <Tooltip.Trigger>
                <div tabIndex={0}>{checkbox}</div>
              </Tooltip.Trigger>
              <Tooltip.Content>{t('staking.validatorSelection.badgeHint.blocked')}</Tooltip.Content>
            </Tooltip>
          );
        },
      },
      {
        key: 'validator',
        title: t('staking.validatorSelection.column.validator'),
        sortable: true,
        width: '31%',
        render: (_, row) => {
          const validator = row.validator;
          if (nullable(validator)) return <Skeleton width="70%" height="16px" />;

          const flag = getValidatorFlag(validator, clusterPositions[validator.accountId]);

          return (
            <div className="flex min-w-0 items-center gap-x-2">
              <Account
                hideAddress
                hideExplorers
                accountId={validator.accountId}
                chain={chain}
                title={getDisplayedLabel(validator.accountId, displayed)}
                variant="short"
                iconSize={22}
              />
              {flag ? <ValidatorFlagBadge flag={flag} clusterPosition={clusterPositions[validator.accountId]} /> : null}
            </div>
          );
        },
      },
      {
        key: 'score',
        title: numericTitle(t('staking.validatorSelection.column.score')),
        sortable: true,
        width: '9%',
        render: (_, row) =>
          nullable(row.score) ? (
            <Skeleton width="60%" height="16px" />
          ) : (
            <div
              className={cnTw(
                'text-right font-semibold tabular-nums',
                SCORE_TONE_CLASS[getScoreTone(toScoreOutOfTen(row.score))],
              )}
            >
              {t('staking.validatorSelection.scoreOutOfTen', { score: toScoreOutOfTen(row.score) })}
            </div>
          ),
      },
      {
        key: 'eraPoints',
        title: numericTitle(t('staking.validatorSelection.column.eraPoints')),
        sortable: true,
        width: '10%',
        render: (_, row) =>
          nullable(row.eraPoints) ? (
            <Skeleton width="60%" height="16px" />
          ) : (
            <div className="text-right tabular-nums">{row.eraPoints.toLocaleString()}</div>
          ),
      },
      {
        key: 'nominators',
        title: numericTitle(t('staking.validatorSelection.column.nominators')),
        sortable: true,
        width: '12%',
        render: (_, row) => {
          const validator = row.validator;
          if (nullable(validator) || nullable(row.nominators)) return <Skeleton width="60%" height="16px" />;

          // The cap is the exposure page size, so "412 / 512" says how far into
          // the current page the validator is. Passing it is not a penalty:
          // every page is payable through `payout_stakers_by_page`.
          const cap = validator.maxNominatorsRewarded;

          return (
            <div className="text-right tabular-nums">
              {nullable(cap)
                ? row.nominators.toLocaleString()
                : t('staking.validatorSelection.nominatorsOfCap', {
                    nominators: row.nominators.toLocaleString(),
                    cap: cap.toLocaleString(),
                  })}
            </div>
          );
        },
      },
      {
        key: 'ownStake',
        title: numericTitle(t('staking.validatorSelection.column.ownStake')),
        sortable: true,
        width: '15%',
        render: (_, row) =>
          nullable(row.ownStake) || nullable(asset) ? (
            <Skeleton width="70%" height="16px" />
          ) : (
            <div className="text-right tabular-nums">
              <AssetBalance value={row.ownStake} asset={asset} showSymbol={false} className="text-footnote" />
            </div>
          ),
      },
      {
        key: 'commission',
        title: numericTitle(t('staking.validatorSelection.column.commission')),
        sortable: true,
        width: '10%',
        render: (_, row) =>
          nullable(row.commission) ? (
            <Skeleton width="60%" height="16px" />
          ) : (
            <div className="text-right tabular-nums">{`${row.commission.toFixed(1)}%`}</div>
          ),
      },
      {
        key: 'apy',
        title: numericTitle(t('staking.validatorSelection.column.apy')),
        sortable: true,
        width: '10%',
        render: (_, row) => {
          if (nullable(row.validator)) return <Skeleton width="60%" height="16px" />;

          return nullable(row.apy) ? (
            <div className="text-right text-text-tertiary tabular-nums">{UNKNOWN_VALUE}</div>
          ) : (
            <div className="text-right font-semibold text-text-positive tabular-nums">{`${row.apy.toFixed(1)}%`}</div>
          );
        },
      },
    ];
  }, [t, chain, asset, displayed, clusterPositions, selectedSet, nominatedSet, isReadOnly, atLimit]);

  const handleSortChange = (next: TableSort | null) => {
    // `Table` cycles asc → desc → null, but this list is never meaningfully
    // unsorted. Folding `null` back onto the same column as ascending keeps the
    // header a plain two-way toggle; sending it to `DEFAULT_SORT` instead made
    // the third click on the APY column a no-op, so APY-ascending was
    // unreachable and a third click on any other column silently teleported the
    // table back to APY descending.
    if (nullable(next)) {
      events.sortChanged({ column: sort.column, direction: 'asc' });

      return;
    }

    if (isSortColumn(next.column)) {
      events.sortChanged({ column: next.column, direction: next.direction });
    }
  };

  return (
    <ScrollArea>
      <Table
        columns={columns}
        data={rows}
        sort={sort}
        getRowKey={(row) => row.rowKey}
        // Deliberately not `disabled` for a blocked validator. `disabled` drops
        // the row's click handler along with its hover, which made a blocked row
        // the one row in the table you could not open - so the numbers a user
        // needs to understand *why* it is blocked were unreachable. Only the
        // checkbox is inert; the row stays inspectable like any other.
        rowProps={(row) => ({
          selected: nonNullable(row.validator) && row.validator.accountId === detailValidator?.accountId,
        })}
        onSortChange={handleSortChange}
        onRowClick={(row) => {
          if (nonNullable(row.validator)) {
            events.detailOpened(row.validator.accountId);
          }
        }}
      />

      {!pending && rows.length === 0 ? <NoValidators /> : null}
    </ScrollArea>
  );
};

const NoValidators = () => {
  const { t } = useI18n();

  return (
    <div className="flex flex-col items-center gap-y-2 py-6">
      <EmptyMessage
        title={t('staking.validatorSelection.empty.title')}
        description={t('staking.validatorSelection.empty.description')}
      />
      <Button variant="text" size="sm" onClick={() => events.clearSearchAndFilters()}>
        {t('staking.validatorSelection.empty.action')}
      </Button>
    </div>
  );
};
