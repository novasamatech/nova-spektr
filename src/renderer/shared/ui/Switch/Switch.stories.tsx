import type { Meta, StoryObj } from '@storybook/react';

import { withVersion } from '@renderer/shared/lib/utils';
import { Switch } from './Switch';

const meta: Meta<typeof Switch> = {
  title: 'Design system/Switch',
  component: Switch,
  decorators: [withVersion('1.0.0')],
};

export default meta;
type Story = StoryObj<typeof Switch>;

export const Primary: Story = {
  args: {
    children: 'Switch label',
  },
};

export const Disabled: Story = {
  args: {
    children: 'Switch label',
    disabled: true,
  },
};
