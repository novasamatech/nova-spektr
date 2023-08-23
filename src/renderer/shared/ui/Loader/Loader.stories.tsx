import type { Meta, StoryObj } from '@storybook/react';

import { withVersion } from '@renderer/shared/lib/utils/storybook';
import { Loader } from './Loader';

const meta: Meta<typeof Loader> = {
  title: 'Design system/Loader ',
  component: Loader,
  decorators: [withVersion('1.0.0')],
};

export default meta;
type Story = StoryObj<typeof Loader>;

export const Primary: Story = {
  args: {
    size: 32,
    color: 'primary',
  },
};

export const White: Story = {
  args: {
    size: 32,
    color: 'white',
  },
};
