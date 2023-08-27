import type { Meta, StoryObj } from '@storybook/react';

import { withVersion } from '@renderer/shared/lib/utils/storybook';
import { LabelHelpBox } from './LabelHelpBox';

const meta: Meta<typeof LabelHelpBox> = {
  title: 'Design system/LabelHelpBox',
  component: LabelHelpBox,
  decorators: [withVersion('1.0.0')],
};

export default meta;
type Story = StoryObj<typeof LabelHelpBox>;

export const Playground: Story = {
  args: {
    children: 'This is simple content',
  },
};
