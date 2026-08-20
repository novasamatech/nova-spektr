import { type Meta, type StoryObj } from '@storybook/react-vite';

import { type Asset, type Chain } from '@/shared/core';
import { TOOLTIP_INSET } from '../lib/constants';
import { defaultDateFormatter } from '../lib/labels';
import { resolveVisibleAccountRows } from '../lib/tooltip';
import { type RewardBucket } from '../lib/types';

import { RewardsChartTooltip } from './RewardsChartTooltip';

// `AssetId` and `ChainId` are branded and only ever built by parsing the chain
// config, so story fixtures are cast the way the rest of the kit's stories cast
// them (see `AssetBalance.stories.tsx`).
/* eslint-disable @typescript-eslint/consistent-type-assertions */
const asset = {
  assetId: 0,
  symbol: 'DOT',
  name: 'Polkadot',
  precision: 10,
  icon: { monochrome: '', colored: '' },
} as unknown as Asset;

const chain = {
  chainId: '0x91b171bb158e2d3848fa23a9f1c25182fb8e20313b2c1eb49219da7a70ce90c3',
  specName: 'polkadot',
  name: 'Polkadot',
  assets: [asset],
  nodes: [],
  explorers: [],
  icon: '',
  addressPrefix: 0,
} as unknown as Chain;
/* eslint-enable @typescript-eslint/consistent-type-assertions */

const bucketOf = (accounts: number): RewardBucket => ({
  start: Date.UTC(2026, 6, 20),
  end: Date.UTC(2026, 6, 21),
  granularity: 'day',
  total: '39070300000',
  accounts: Array.from({ length: accounts }, (_, index) => ({
    accountId: `0x${String(index + 1)
      .repeat(2)
      .padStart(64, 'a')}`,
    amount: '3907030000',
    share: 1 / accounts,
  })),
});

/**
 * The card as the widget mounts it: inside the plot box, capped at its height.
 *
 * This is also where the card's measurements are checked —
 * `TOOLTIP_ROW_HEIGHT`, `TOOLTIP_ROW_GAP` and `TOOLTIP_CHROME_HEIGHT` are read
 * off this layout, and the row budget lies if they drift from it. To
 * re-measure, with the card rendered:
 *
 * ```js
 * const card = document.querySelector('[data-testid="rewards-tooltip"]');
 * const list = card.querySelector('.overflow-hidden');
 * const [a, b] = list.children;
 * a.getBoundingClientRect().height; // → row height
 * b.getBoundingClientRect().top - a.getBoundingClientRect().bottom; // → row gap
 * card.getBoundingClientRect().height -
 *   list.getBoundingClientRect().height; // → chrome
 * ```
 *
 * Measured 2026-08-20: row 20.0, gap 6.0, chrome 102.7 with the remainder line.
 * The stories below derive the row count the way the widget does, so a drift
 * shows up here as a clipped row or a total pushed past the plot.
 */
const Framed = ({ plotHeight, accounts }: { plotHeight: number; accounts: number }) => (
  <div className="bg-main-app-background p-6">
    <div className="relative bg-white" style={{ height: plotHeight, width: 900 }}>
      <div
        className="pointer-events-none absolute top-1 left-0 z-10 flex flex-col"
        style={{ maxHeight: plotHeight - TOOLTIP_INSET }}
      >
        <RewardsChartTooltip
          bucket={bucketOf(accounts)}
          chain={chain}
          asset={asset}
          color="#e6007a"
          era={2265}
          // Derived here exactly as the widget derives it, so a story can never
          // show a card the app cannot produce — and a drift in the measured
          // constants shows up as a clipped row on this page.
          maxAccounts={resolveVisibleAccountRows(plotHeight)}
          walletByAccountId={new Map()}
          formatDate={defaultDateFormatter}
        />
      </div>
    </div>
  </div>
);

const meta: Meta<typeof Framed> = {
  title: 'v1/features/RewardsChartTooltip',
  component: Framed,
  args: { plotHeight: 600, accounts: 12 },
};

export default meta;

type Story = StoryObj<typeof Framed>;

/** Every contributing account fits. */
export const Default: Story = {};

/** More accounts than the plot has room for: the rest are named, not dropped. */
export const Truncated: Story = {
  args: { plotHeight: 260, accounts: 12 },
};

/** The widget at its minimum height — one row, and the total still readable. */
export const Squeezed: Story = {
  args: { plotHeight: 157, accounts: 12 },
};
