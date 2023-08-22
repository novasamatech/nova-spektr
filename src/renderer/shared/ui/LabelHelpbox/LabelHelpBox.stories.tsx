import type { Meta, StoryObj } from '@storybook/react';

import { LabelHelpBox } from './LabelHelpBox';

const meta: Meta<typeof LabelHelpBox> = {
  title: 'LabelHelpBox',
  component: LabelHelpBox,
};

export default meta;
type Story = StoryObj<typeof LabelHelpBox>;

export const Primary: Story = {
  args: {
    children: 'This is simple content',
  },
};
