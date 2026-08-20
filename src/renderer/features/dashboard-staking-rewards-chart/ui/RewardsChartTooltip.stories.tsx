import { type Meta, type StoryObj } from '@storybook/react-vite';

import { type Asset, type Chain } from '@/shared/core';
import { defaultDateFormatter } from '../lib/labels';
import { type RewardBucket } from '../lib/types';

import { RewardsChartTooltip } from './RewardsChartTooltip';

// `AssetId` and `ChainId` are branded and only built by parsing the chain
// config, so fixtures are cast as elsewhere in the kit's stories.
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

/** The card as the widget mounts it: inside the plot box, capped at its height. */
const Framed = ({ plotHeight, accounts }: { plotHeight: number; accounts: number }) => (
  <div className="bg-main-app-background p-6">
    <div className="relative bg-white" style={{ height: plotHeight, width: 900 }}>
      <div className="pointer-events-none absolute top-1 left-0 z-10 flex max-h-[calc(100%-0.5rem)] flex-col">
        <RewardsChartTooltip
          bucket={bucketOf(accounts)}
          chain={chain}
          asset={asset}
          color="#e6007a"
          era={2265}
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

/** More accounts than the plot has room for: the list is cut, the total is not. */
export const Clipped: Story = {
  args: { plotHeight: 260, accounts: 12 },
};

/** The widget at its minimum height. */
export const Squeezed: Story = {
  args: { plotHeight: 157, accounts: 12 },
};
