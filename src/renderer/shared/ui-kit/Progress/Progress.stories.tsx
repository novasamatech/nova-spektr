import { type Meta, type StoryObj } from '@storybook/react';

import { Box } from '../Box/Box';

import { Progress } from './Progress';

const meta: Meta<typeof Progress> = {
  title: 'Design System/kit/Progress',
  component: Progress,
  render: (args) => {
    return (
      <Box width="500px" fitContainer>
        <Progress {...args} />
      </Box>
    );
  },
};

export default meta;

type Story = StoryObj<typeof Progress>;

export const Default: Story = {
  args: {
    value: 35,
    max: 100,
  },
};
