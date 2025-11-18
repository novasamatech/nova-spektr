import { type Meta, type StoryObj } from '@storybook/react-vite';

import { Box } from '@/shared/ui-kit';

import { CollectiveRank } from './CollectiveRank';

const meta: Meta<typeof CollectiveRank> = {
  title: 'Design System/entities/CollectiveRank',
  component: CollectiveRank,
  render: props => (
    <Box gap={1}>
      {Array.from({ length: 9 }).map((_, index) => (
        <CollectiveRank key={index} {...props} rank={index} />
      ))}
    </Box>
  ),
};

export default meta;

type Story = StoryObj<typeof CollectiveRank>;

export const Default: Story = {};

export const WithName: Story = {
  args: {
    showName: true,
  },
};
