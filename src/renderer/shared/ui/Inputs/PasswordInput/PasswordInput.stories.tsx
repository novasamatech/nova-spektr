import type { Meta, StoryObj } from '@storybook/react';

import { withVersion } from '@renderer/shared/lib/utils/storybook';
import { PasswordInput } from './PasswordInput';

const meta: Meta<typeof PasswordInput> = {
  title: 'Design system/Inputs/PasswordInput',
  component: PasswordInput,
  decorators: [withVersion('1.0.0')],
};

export default meta;
type Story = StoryObj<typeof PasswordInput>;

export const Playground: Story = {
  args: {
    placeholder: 'Test input',
  },
};
