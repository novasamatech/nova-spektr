import type { Meta, StoryObj } from '@storybook/react';

import { withVersion } from '@renderer/shared/lib/utils';
import { Button } from './Button';

const meta: Meta<typeof Button> = {
  title: 'Design system/Buttons/Button',
  component: Button,
  parameters: {
    controls: { sort: 'requiredFirst' },
  },
  decorators: [withVersion('1.0.0')],
};

export default meta;
type Story = StoryObj<typeof Button>;

const UiOptions: Story['argTypes'] = {
  pallet: {
    control: 'radio',
    options: ['primary', 'secondary', 'error'],
  },
  icon: {
    options: [undefined, 'chat', 'learn-more', 'close'],
  },
  form: { control: false },
  className: { control: false },
  type: { control: false },
  suffixElement: { control: false },
  onClick: { control: false },
};

export const Playground: Story = {
  args: {
    pallet: 'primary',
    size: 'md',
    children: 'Hello button',
  },
  argTypes: UiOptions,
};

export const Icon: Story = {
  render: () => (
    <Button pallet="primary" icon="chat">
      Hello button
    </Button>
  ),
};

const suffixElement = <span className="rounded-lg bg-bg-shade text-caption text-text-white px-2 py-0.5">99+</span>;
export const SuffixElement: Story = {
  render: () => (
    <Button pallet="secondary" suffixElement={suffixElement} icon="chat">
      Hello button
    </Button>
  ),
};
