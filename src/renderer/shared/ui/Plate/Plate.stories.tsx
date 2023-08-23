import type { Meta, StoryObj } from '@storybook/react';

import { withVersion } from '@renderer/shared/lib/utils/storybook';
import { Plate } from './Plate';

const meta: Meta<typeof Plate> = {
  title: 'Design system/Plate',
  component: Plate,
  decorators: [withVersion('1.0.0')],
};

export default meta;
type Story = StoryObj<typeof Plate>;

export const Playground: Story = {
  args: {
    children: 'This is simple content',
  },
};
