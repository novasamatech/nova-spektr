import type { Meta, StoryObj } from '@storybook/react';

import { ChainTitle } from './ChainTitle';
import { TEST_CHAIN_ID } from '@renderer/shared/lib/utils';

const meta: Meta<typeof ChainTitle> = {
  title: 'Redesign/Chain',
  component: ChainTitle,
};

export default meta;
type Story = StoryObj<typeof ChainTitle>;

export const Primary: Story = {
  args: {
    chainId: TEST_CHAIN_ID,
  },
};
