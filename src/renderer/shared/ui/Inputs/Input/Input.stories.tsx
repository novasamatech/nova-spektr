import type { Meta, StoryObj } from '@storybook/react';

import { withVersion } from '@renderer/shared/lib/utils/storybook';
import { Input } from './Input';
import { Icon } from '../../Icon/Icon';

const meta: Meta<typeof Input> = {
  title: 'Design system/Inputs/Input',
  component: Input,
  decorators: [withVersion('1.0.0')],
};

export default meta;
type Story = StoryObj<typeof Input>;

export const Primary: Story = {
  args: {
    placeholder: 'Test input',
  },
};

export const Filled: Story = {
  args: {
    value: 'This is value',
  },
};

export const Label: Story = {
  args: {
    label: 'With label',
    value: 'This is value',
  },
};

export const Invalid: Story = {
  args: {
    label: 'With invalid',
    value: 'This is value',
    invalid: true,
  },
};

export const Disabled: Story = {
  args: {
    label: 'With disabled label',
    value: 'This is value',
    disabled: true,
  },
};

export const Suffix: Story = {
  args: {
    label: 'With suffix element',
    value: 'This is value',
    suffixElement: <Icon name="status-warning" className="text-alert right-2 top-[9px] absolute" size={16} />,
  },
};
