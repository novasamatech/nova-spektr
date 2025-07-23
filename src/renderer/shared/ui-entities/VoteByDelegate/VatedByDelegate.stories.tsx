import { BN, BN_TEN } from '@polkadot/util';
import { type Meta, type StoryObj } from '@storybook/react-vite';

import { type Asset } from '@/shared/core';
import { TEST_ADDRESS } from '@/shared/lib/utils';

import { VotedByDelegate } from './VotedByDelegate';

const meta: Meta<typeof VotedByDelegate> = {
  title: 'Design System/entities/VotedByDelegate',
  component: VotedByDelegate,
  args: {
    address: TEST_ADDRESS,
    votingPower: BN_TEN,
    asset: {
      symbol: 'DOT',
      precision: 2,
    } as unknown as Asset,
  },
};

export default meta;

type Story = StoryObj<typeof VotedByDelegate>;

export const Default: Story = {
  args: {
    decision: 'aye',
    voterName: 'Chaos DAO',
  },
};

export const WithoutName: Story = {
  args: {
    votingPower: new BN('2500000'),
    decision: 'nay',
  },
};
