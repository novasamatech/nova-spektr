import type { Meta, StoryObj } from '@storybook/react';

import { TEST_CHAIN_ID, withVersion } from '@renderer/shared/lib/utils';
import { ChainTitle } from './ChainTitle';

const meta: Meta<typeof ChainTitle> = {
  title: 'Design system/Chain',
  component: ChainTitle,
  decorators: [withVersion('1.0.0')],
};

export default meta;
type Story = StoryObj<typeof ChainTitle>;

export const Primary: Story = {
  args: {
    chainId: TEST_CHAIN_ID,
  },
};
