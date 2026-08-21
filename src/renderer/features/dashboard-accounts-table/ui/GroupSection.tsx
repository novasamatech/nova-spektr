import { type BN } from '@polkadot/util';
import { memo } from 'react';

import { type Asset } from '@/shared/core';
import { useI18n } from '@/shared/i18n';
import { cnTw } from '@/shared/lib/utils';
import { BodyText, FootnoteText, HelpText, Icon } from '@/shared/ui';
import { AssetBalance, ChainIcon, RootExplorers } from '@/shared/ui-entities';
import { NamedAccount } from '@/widgets/NameResolver';
import { AssetFiatBalance } from '@/widgets/price';
import { type AccountGroup, type AccountRow, type NumericKey } from '../lib/types';

import {
  AMOUNT_CELL_CLASS,
  GRID_TEMPLATE,
  GROUP_HEADER_CLASS,
  GROUP_HEADER_SPAN_CLASS,
  NUMERIC_COLUMNS,
  ROW_CLASS,
  TOTAL_CELL_CLASS,
  WIDE_ONLY_CLASS,
} from './tableLayout';

type Props = {
  group: AccountGroup;
  open: boolean;
  onToggle: (key: string) => void;
  fiatVisible: boolean;
  formatSubtotal: (value: number | null) => string;
};

type NumericCellProps = {
  value: BN | null;
  asset: Asset;
  fiatVisible: boolean;
  /** Total is the column the eye lands on: heavier, and on the accent surface. */
  emphasis?: boolean;
};

/**
 * Thousands are abbreviated here, as they are on the staking KPI cards, even
 * though the app's default spells them out: a cell in a five-column table has
 * room for `242.03K DOT`, not `242,026.5241 DOT`, and the exact figure is one
 * CSV export away.
 */
const AMOUNT_SHORTHANDS = { K: true } as const;

/**
 * Four decimals, and `<0.0001` below that. Five columns of amounts have to fit
 * a half-width widget side by side; the exact figure, to the last planck, is
 * what the CSV export is for.
 */
const AMOUNT_MAX_DECIMALS = 4;

/**
 * One purpose bucket: the token amount with its fiat equivalent underneath.
 *
 * A zero says "nothing here" and is drawn that way — muted, and without a `$0`
 * under it. Spelling out the fiat value of nothing is a line of type that can
 * only ever read `$0`, on the rows a person is scanning past.
 */
const NumericCell = ({ value, asset, fiatVisible, emphasis }: NumericCellProps) => {
  if (value === null) {
    return <BodyText className="text-right text-text-tertiary">—</BodyText>;
  }

  const isZero = value.isZero();

  return (
    <div className={AMOUNT_CELL_CLASS}>
      <AssetBalance
        value={value}
        asset={asset}
        shorthands={AMOUNT_SHORTHANDS}
        maxDecimals={AMOUNT_MAX_DECIMALS}
        className={cnTw(isZero && 'text-text-tertiary', emphasis && 'font-semibold')}
      />
      {fiatVisible && !isZero ? <AssetFiatBalance asset={asset} amount={value} /> : null}
    </div>
  );
};

const numericValue = (row: AccountRow, key: NumericKey): BN | null => (key === 'total' ? row.totalBN : row.split[key]);

type DataRowProps = {
  row: AccountRow;
  fiatVisible: boolean;
};

const DataRow = ({ row, fiatVisible }: DataRowProps) => (
  <div className={cnTw(GRID_TEMPLATE, ROW_CLASS, 'hover:bg-block-background')}>
    {/* 18px = 12px caret glyph + 6px gap, so the chain icon lines up under the
        group header's caret column rather than the row's own left edge. */}
    <div className="flex min-w-0 items-center gap-x-2 pl-[18px]" title={row.chain.name}>
      <ChainIcon chain={row.chain} size={16} />
      {/* Icon-only below the full width — the title above is what names the
          chain there, so the icon must never be the only thing on offer. */}
      <FootnoteText className={cnTw('truncate', WIDE_ONLY_CLASS)}>{row.chain.name}</FootnoteText>
    </div>

    <span className={cnTw('min-w-0 truncate', WIDE_ONLY_CLASS)} title={row.displayAddress}>
      <FootnoteText className="truncate text-text-secondary">{row.shortAddress}</FootnoteText>
    </span>

    {NUMERIC_COLUMNS.map((key) =>
      key === 'total' ? (
        <div key={key} className={TOTAL_CELL_CLASS}>
          <NumericCell value={numericValue(row, key)} asset={row.asset} fiatVisible={fiatVisible} emphasis />
        </div>
      ) : (
        <NumericCell key={key} value={numericValue(row, key)} asset={row.asset} fiatVisible={fiatVisible} />
      ),
    )}
  </div>
);

export const GroupSection = memo(({ group, open, onToggle, fiatVisible, formatSubtotal }: Props) => {
  const { t } = useI18n();

  const handleToggle = () => onToggle(group.key);

  return (
    <div>
      {/* A row, not a button: the explorers popover is a button of its own, and
          one button may not live inside another. The fold trigger is the account
          block — caret through address — and the subtotal is left alone. */}
      <div className={cnTw(GRID_TEMPLATE, GROUP_HEADER_CLASS, 'group hover:bg-block-background-hover')}>
        <div className={GROUP_HEADER_SPAN_CLASS}>
          {/* Not `flex-1`: the button ends where the name ends, which is where
              the explorers icon has to sit. It still shrinks (and the name
              truncates) when the account block runs out of room. */}
          <button type="button" className="flex min-w-0 items-center gap-x-2 text-left" onClick={handleToggle}>
            <Icon name={open ? 'down' : 'right'} size={12} className="shrink-0 text-text-tertiary" />

            {/* Identicon, name and address all come from `NamedAccount` — no
                hand-assembled trio — so this header renders an account exactly
                the way every other screen does. Its own explorers button is off:
                a chain-less account gets `RootExplorers` instead, see below. */}
            <NamedAccount
              accountId={group.accountId}
              chain={null}
              title={group.name}
              wallet={group.wallet}
              variant="short"
              iconSize={24}
              hideExplorers
              titleClass="truncate text-body font-semibold"
            />
          </button>

          {/* Generic Subscan / Sub.ID links, as in wallet management: a group is
              an account across chains, so there is no chain whose explorer to
              open — `AccountExplorers` with `chain={null}` would offer none.
              Revealed on hover (and on keyboard focus, which `opacity` alone
              would strand): ninety of these icons stacked down the table read as
              a column of noise, while the one on the row under the pointer reads
              as an offer. The space is reserved either way, so nothing shifts. */}
          <span className="shrink-0 opacity-0 transition-opacity group-focus-within:opacity-100 group-hover:opacity-100">
            <RootExplorers accountId={group.accountId} />
          </span>

          <div className="flex-1" />
        </div>

        {fiatVisible ? (
          // Last cell of the same grid, so an account's subtotal lands in the
          // very track its rows' totals do — at any width, with no number to
          // keep in sync.
          <div className={TOTAL_CELL_CLASS}>
            <BodyText className="font-semibold tabular-nums">{formatSubtotal(group.subtotalFiat)}</BodyText>
            <HelpText className="tracking-wide text-text-tertiary uppercase">
              {t('dashboard.accountsTable.subtotal')}
            </HelpText>
          </div>
        ) : null}
      </div>

      {open ? (
        <div>
          {group.rows.map((row) => (
            <DataRow key={row.id} row={row} fiatVisible={fiatVisible} />
          ))}
        </div>
      ) : null}
    </div>
  );
});
