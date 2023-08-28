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

const UiOptions: Story['argTypes'] = {
  className: { control: false },
  wrapperClass: { control: false },
  prefixElement: { control: false },
  suffixElement: { control: false },
};

export const Playground: Story = {
  args: {
    placeholder: 'Test input',
  },
  argTypes: UiOptions,
};

export const Label: Story = {
  render: () => <Input label="With label" value="This is value" />,
};

export const Disabled: Story = {
  render: () => <Input value="This is value" disabled />,
};

export const Prefix: Story = {
  render: () => (
    <Input
      value="This is value"
      prefixElement={<Icon name="status-success" className="text-alert right-2 absolute" size={16} />}
    />
  ),
};

export const Suffix: Story = {
  render: () => (
    <Input
      value="This is value"
      suffixElement={<Icon name="status-warning" className="text-alert right-2 absolute" size={16} />}
    />
  ),
};
