import { type Meta, type StoryObj } from '@storybook/react';

import { LabelHelpBox } from './LabelHelpBox';

const meta: Meta<typeof LabelHelpBox> = {
  title: 'Design System/kit/LabelHelpBox',
  component: LabelHelpBox,
  args: {
    children: 'This is placeholder text',
  },
};

export default meta;

type Story = StoryObj<typeof LabelHelpBox>;

export const Default: Story = {};
