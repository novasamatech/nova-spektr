import { BN } from '@polkadot/util';
import { type Meta, type StoryObj } from '@storybook/react';

import { type Asset, type SplitAbstainVote, type SplitVote, type StandardVote } from '@/shared/core';
import { TEST_ADDRESS } from '@/shared/lib/utils';

import { VotedBy } from './VotedBy';

const meta: Meta<typeof VotedBy> = {
  title: 'Design System/entities/VotedBy',
  component: VotedBy,
  args: {
    castingVotes: [],
    asset: {
      symbol: 'DOT',
      precision: 2,
    } as unknown as Asset,
  },
};

export default meta;

type Story = StoryObj<typeof VotedBy>;

export const Default: Story = {
  args: {
    castingVotes: [
      {
        voter: TEST_ADDRESS,
        vote: {
          type: 'Standard',
          balance: new BN(670000),
          vote: {
            aye: true,
            conviction: 'Locked6x',
          },
        } as StandardVote,
      },
    ],
  },
};

export const AccountSplit: Story = {
  args: {
    castingVotes: [
      {
        voter: TEST_ADDRESS,
        vote: {
          type: 'Split',
          aye: new BN(78000),
          nay: new BN(25000),
        } as SplitVote,
      },
    ],
  },
};

export const AccountSplitAbstain: Story = {
  args: {
    castingVotes: [
      {
        voter: TEST_ADDRESS,
        vote: {
          type: 'SplitAbstain',
          aye: new BN(78000),
          nay: new BN(25000),
          abstain: new BN(44000),
        } as SplitAbstainVote,
      },
    ],
  },
};

export const Delegate: Story = {
  args: {
    voterName: 'Chaos DAO OpenGov',
    delegate: {
      decision: 'aye',
      delegateId: TEST_ADDRESS,
      amount: new BN(45000000),
      conviction: 'Locked3x',
    },
  },
};
