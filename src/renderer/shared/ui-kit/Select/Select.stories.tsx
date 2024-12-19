import { type Meta, type StoryObj } from '@storybook/react';
import { useState } from 'react';

import { Icon } from '@/shared/ui';
import { Box } from '../Box/Box';
import { ThemeProvider } from '../Theme/ThemeProvider';

import { Select } from './Select';

const meta: Meta<typeof Select> = {
  title: 'Design System/kit/Select',
  component: Select,
  render: (params) => {
    const [value, onChange] = useState('');

    return (
      <Box width="200px">
        <Select {...params} placeholder="Select a fruit" value={value} onChange={onChange}>
          <Select.Item value="item_1">Apple</Select.Item>
          <Select.Item value="item_2">Orange</Select.Item>
          <Select.Item value="item_3">Watermelon</Select.Item>
          <Select.Item value="item_4">Banana-nana-nana-nana-nana-nana</Select.Item>
        </Select>
      </Box>
    );
  },
};

export default meta;

type Story = StoryObj<typeof Select>;

export const Default: Story = {};

export const RichContent: Story = {
  render: (args) => {
    const [value, onChange] = useState('item_4');

    return (
      <Box width="200px">
        <Select {...args} placeholder="Select a fruit" value={value} onChange={onChange}>
          <Select.Item value="item_1">
            <Box direction="row" verticalAlign="center" gap={2}>
              <Icon name="btc" size={12} className="shrink-0" />
              <span className="truncate">Apple</span>
            </Box>
          </Select.Item>
          <Select.Item value="item_2">
            <Box direction="row" verticalAlign="center" gap={2}>
              <Icon name="usd" size={12} className="shrink-0" />
              <span className="truncate">Orange</span>
            </Box>
          </Select.Item>
          <Select.Item value="item_3">
            <Box direction="row" verticalAlign="center" gap={2}>
              <Icon name="eur" size={12} className="shrink-0" />
              <span className="truncate">Watermelon</span>
            </Box>
          </Select.Item>
          <Select.Item value="item_4">
            <Box direction="row" verticalAlign="center" gap={2}>
              <Icon name="rub" size={12} className="shrink-0" />
              <span className="truncate">Banana-nana-nana-nana-nana-nana</span>
            </Box>
          </Select.Item>
        </Select>
      </Box>
    );
  },
};

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

export const Groups: Story = {
  render: (params) => {
    const [value, onChange] = useState('');

    return (
      <Box width="200px">
        <Select {...params} placeholder="Select a fruit" value={value} onChange={onChange}>
          <Select.Group title="Group 1">
            <Select.Item value="item_1">Apple</Select.Item>
            <Select.Item value="item_2">Orange</Select.Item>
          </Select.Group>
          <Select.Group title="Group 2">
            <Select.Item value="item_3">Watermelon</Select.Item>
            <Select.Item value="item_4">Banana</Select.Item>
          </Select.Group>
        </Select>
      </Box>
    );
  },
};

export const Dark: Story = {
  decorators: [
    (Story, { args }) => {
      return (
        <ThemeProvider theme="dark">
          <div className="flex h-[300px] w-[400px] justify-center rounded-lg bg-black pt-[50px]">
            <Story args={args} />;
          </div>
        </ThemeProvider>
      );
    },
  ],
};
