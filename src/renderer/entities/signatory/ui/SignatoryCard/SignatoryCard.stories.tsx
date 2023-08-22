import type { Meta, StoryObj } from '@storybook/react';

import { SignatoryCard } from './SignatoryCard';
import { TEST_ADDRESS } from '@renderer/shared/lib/utils';

const meta: Meta<typeof SignatoryCard> = {
  title: 'Redesign/Signatory',
  component: SignatoryCard,
};

export default meta;
type Story = StoryObj<typeof SignatoryCard>;

export const Primary: Story = {
  args: {
    address: TEST_ADDRESS,
    name: 'John Doe',
  },
};
