import { type Meta, type StoryObj } from '@storybook/react';

import { VotedByAccount } from './VotedByAccount';

const meta: Meta<typeof VotedByAccount> = {
  title: 'Design System/entities/VotedByAccount',
  component: VotedByAccount,
  args: {
    active: true,
  },
};

export default meta;

type Story = StoryObj<typeof VotedByAccount>;

export const Default: Story = {};
