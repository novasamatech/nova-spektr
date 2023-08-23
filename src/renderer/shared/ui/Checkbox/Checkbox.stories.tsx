import type { Meta, StoryObj } from '@storybook/react';

import { withVersion } from '@renderer/shared/lib/utils/storybook';
import { Checkbox } from './Checkbox';

const meta: Meta<typeof Checkbox> = {
  title: 'Design system/Checkbox',
  component: Checkbox,
  decorators: [withVersion('1.0.0')],
};

export default meta;
type Story = StoryObj<typeof Checkbox>;

export const Primary: Story = {
  args: {
    children: 'Checkbox',
  },
};

export const Left: Story = {
  args: {
    position: 'left',
    children: 'Checkbox',
  },
};

export const Disabled: Story = {
  args: {
    children: 'Checkbox',
    disabled: true,
  },
};
