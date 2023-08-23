import type { Meta, StoryObj } from '@storybook/react';

import { TEST_ADDRESS, withVersion } from '@renderer/shared/lib/utils';
import { SignatoryCard } from './SignatoryCard';

const meta: Meta<typeof SignatoryCard> = {
  title: 'Design system/Signatory',
  component: SignatoryCard,
  decorators: [withVersion('1.0.0')],
};

export default meta;
type Story = StoryObj<typeof SignatoryCard>;

export const Primary: Story = {
  args: {
    address: TEST_ADDRESS,
    name: 'John Doe',
  },
};
