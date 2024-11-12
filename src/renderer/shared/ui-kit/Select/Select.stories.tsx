import { type Meta, type StoryObj } from '@storybook/react';
import { useState } from 'react';

import { Box } from '../Box/Box';

import { Select } from './Select';

const meta: Meta<typeof Select> = {
  title: 'Design System/kit/Select',
  component: Select,
  parameters: {
    layout: 'centered',
  },
  render: (params) => {
    const [value, onChange] = useState('');

    return (
      <Box width="200px">
        <Select {...params} placeholder="Select a fruit" value={value} onChange={onChange}>
          <Select.Content>
            <Select.Item value="item_1">Apple</Select.Item>
            <Select.Item value="item_2">Orange</Select.Item>
            <Select.Item value="item_3">Watermelon</Select.Item>
            <Select.Item value="item_4">Banana</Select.Item>
          </Select.Content>
        </Select>
      </Box>
    );
  },
};

export default meta;

type Story = StoryObj<typeof Select>;

export const Default: Story = {};

export const Invalid: Story = {
  args: {
    invalid: true,
  },
};

export const Disabled: Story = {
  args: {
    disabled: true,
  },
};

export const Dark: Story = {
  decorators: [
    (Story, { args }) => {
      const [open, onToggle] = useState(false);

      return (
        <div className="flex h-[300px] w-[400px] justify-center rounded-lg bg-black pt-[50px]">
          <Story args={{ ...args, open, onToggle, theme: 'dark' }} />;
        </div>
      );
    },
  ],
};
