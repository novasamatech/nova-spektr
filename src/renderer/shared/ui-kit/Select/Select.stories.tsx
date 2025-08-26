import { type Meta, type StoryObj } from '@storybook/react-vite';
import { useState } from 'react';

import { Icon } from '@/shared/ui';
import { Box } from '../Box/Box';
import { ThemeProvider } from '../Theme/ThemeProvider';

import { Select } from './Select';

const meta: Meta<typeof Select> = {
  title: 'Design System/kit/Select',
  component: Select,
  parameters: {
    viewport: {
      defaultViewport: 'large',
    },
    layout: 'centered',
  },
  decorators: [
    Story => (
      <div className="flex h-[400px] w-[400px] items-center justify-center">
        <Story />
      </div>
    ),
  ],
  render: params => {
    const [value, onChange] = useState('');

    return (
      <Select {...params} placeholder="Select a fruit" value={value} onChange={onChange}>
        <Select.Item value="item_1">Apple</Select.Item>
        <Select.Item value="item_2">Orange</Select.Item>
        <Select.Item value="item_3">Watermelon</Select.Item>
        <Select.Item value="item_4">Banana-nana-nana-nana-nana-nana</Select.Item>
        <Select.Item value="item_5">Cherry</Select.Item>
        <Select.Item value="item_6">Grape</Select.Item>
        <Select.Item value="item_7">Pineapple</Select.Item>
        <Select.Item value="item_8">Strawberry</Select.Item>
      </Select>
    );
  },
};

export default meta;

type Story = StoryObj<typeof Select>;

export const Default: Story = {};

export const RichContent: Story = {
  render: args => {
    const [value, onChange] = useState('item_4');

    return (
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
  render: params => {
    const [value, onChange] = useState('');

    return (
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
    );
  },
};

export const Dark: Story = {
  decorators: [
    (Story, { args }) => {
      return (
        <ThemeProvider theme="dark">
          <div className="flex h-full w-full items-center justify-center rounded-lg bg-black p-8">
            <Story args={args} />
          </div>
        </ThemeProvider>
      );
    },
  ],
};

export const CustomValueNode: Story = {
  render: params => {
    const [value, onChange] = useState('');

    return (
      <Select {...params} placeholder="Select a fruit" value={value} onChange={onChange}>
        <Select.Group title="Group 1">
          <Select.Item value="Apple">Apple</Select.Item>
          <Select.Item value="Orange">Orange</Select.Item>
        </Select.Group>
        <Select.Group title="Group 2">
          <Select.Item value="Watermelon">Watermelon</Select.Item>
          <Select.Item value="Banana">Banana</Select.Item>
        </Select.Group>
      </Select>
    );
  },
};
