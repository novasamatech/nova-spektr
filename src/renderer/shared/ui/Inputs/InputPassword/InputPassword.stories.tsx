import type { Meta, StoryObj } from '@storybook/react';

import { withVersion } from '@renderer/shared/lib/utils/storybook';
import { InputPassword } from './InputPassword';

const meta: Meta<typeof InputPassword> = {
  title: 'Design system/Inputs/InputPassword',
  component: InputPassword,
  decorators: [withVersion('1.0.0')],
};

export default meta;
type Story = StoryObj<typeof InputPassword>;

export const Playground: Story = {
  args: {
    placeholder: 'Test input',
  },
};
