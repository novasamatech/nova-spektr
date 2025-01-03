import { type Meta, type StoryObj } from '@storybook/react';

import { Box } from '../Box/Box';

import { ScrollArea } from './ScrollArea';

const meta: Meta<typeof ScrollArea> = {
  title: 'Design System/kit/ScrollArea',
  component: ScrollArea,
  parameters: {
    layout: 'centered',
  },
  render: params => {
    return (
      <div className="h-80 w-60 border">
        <ScrollArea {...params}>
          <Box direction={params.orientation === 'horizontal' ? 'row' : 'column'} padding={2} gap={2} width="100%">
            {Array.from({ length: 100 }).map((_, i) => (
              <div
                key={i}
                className={params.orientation === 'horizontal' ? 'h-10 w-10' : 'h-10 w-full'}
                style={{ backgroundColor: `rgb(${100 + i} 225 225)` }}
              />
            ))}
          </Box>
        </ScrollArea>
      </div>
    );
  },
};

export default meta;

type Story = StoryObj<typeof ScrollArea>;

export const Default: Story = {};
export const Horizontal: Story = {
  args: {
    orientation: 'horizontal',
  },
};
