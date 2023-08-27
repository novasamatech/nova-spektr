import type { Meta, StoryObj } from '@storybook/react';

import { withVersion } from '@renderer/shared/lib/utils/storybook';
import { ButtonText } from './ButtonText';

const meta: Meta<typeof ButtonText> = {
  title: 'Design system/Buttons/ButtonText',
  component: ButtonText,
  decorators: [withVersion('1.0.0')],
};

export default meta;
type Story = StoryObj<typeof ButtonText>;

const UiOptions: Story['argTypes'] = {
  icon: {
    options: [undefined, 'address-book', 'chat', 'learn-more'],
  },
  className: { control: false },
};

export const Playground: Story = {
  args: {
    size: 'md',
    children: 'Hello button',
  },
  argTypes: UiOptions,
};

export const WithIcon: Story = {
  render: () => <ButtonText icon="address-book">Hello button</ButtonText>,
};
