import { type Meta, type StoryObj } from '@storybook/react-vite';

import { Box } from '../Box/Box';

import { Indicator } from './Indicator';

const meta: Meta<typeof Indicator> = {
  component: Indicator,
  title: 'Design System/kit/Indicator',
};

export default meta;

type Story = StoryObj<typeof Indicator>;

export const Default: Story = {
  args: {
    active: true,
  },
};

export const States: Story = {
  render() {
    return (
      <Box gap={4}>
        <div className="flex items-center gap-2">
          <Indicator active={true} />
          <span>Active</span>
        </div>
        <div className="flex items-center gap-2">
          <Indicator active={false} />
          <span>Inactive</span>
        </div>
      </Box>
    );
  },
};
