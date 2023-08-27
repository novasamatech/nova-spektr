import type { Meta, StoryObj } from '@storybook/react';

import { withVersion } from '@renderer/shared/lib/utils/storybook';
import { ButtonIcon } from './ButtonIcon';

const meta: Meta<typeof ButtonIcon> = {
  title: 'Design system/Buttons/ButtonIcon',
  component: ButtonIcon,
  decorators: [withVersion('1.0.0')],
};

export default meta;
type Story = StoryObj<typeof ButtonIcon>;

const UiOptions: Story['argTypes'] = {
  icon: {
    options: [undefined, 'chat', 'learn-more', 'close'],
  },
  className: { control: false },
  ariaLabel: { control: false },
};

export const Playground: Story = {
  args: {
    icon: 'close',
    size: 'md',
    background: true,
  },
  argTypes: UiOptions,
};

export const WithBackground: Story = {
  render: () => <ButtonIcon background icon="refresh" />,
};

export const NoBackground: Story = {
  render: () => <ButtonIcon icon="refresh" />,
};
