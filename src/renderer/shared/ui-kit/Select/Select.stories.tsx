import { type Meta, type StoryObj } from '@storybook/react-vite';
import { useState } from 'react';

import { TEST_ACCOUNTS, toAddress } from '@/shared/lib/utils';
import { Address } from '@/shared/ui-entities';
import { ThemeProvider } from '../Theme/ThemeProvider';

import { Select } from './Select';

const meta: Meta<typeof Select> = {
  title: 'Design System/kit/Select',
  component: Select,
  decorators: [
    Story => (
      <div className="w-[300px]">
        <Story />
      </div>
    ),
  ],
  args: {
    placeholder: 'Select a fruit',
  },
  render: params => {
    const [value, onChange] = useState('');

    return (
      <Select {...params} value={value} onChange={onChange}>
        <Select.Item value="item_1">Apple</Select.Item>
        <Select.Item value="item_2">Orange</Select.Item>
        <Select.Item value="item_3">Watermelon</Select.Item>
        <Select.Item value="item_4">Banana-nana-nana-nana-nana-nana-nana-nana-nana-nana-nana</Select.Item>
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
      <Select {...args} value={value} onChange={onChange}>
        {TEST_ACCOUNTS.map(accountId => (
          <Select.Item key={accountId} value={accountId}>
            <Address showIcon variant="truncate" address={toAddress(accountId)} />
          </Select.Item>
        ))}
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
      <Select {...params} value={value} onChange={onChange}>
        <Select.Group title="Fruits">
          <Select.Item value="item_1">Apple</Select.Item>
          <Select.Item value="item_2">Orange</Select.Item>
        </Select.Group>
        <Select.Group title="Vegetables">
          <Select.Item value="item_3">Cucumber</Select.Item>
          <Select.Item value="item_4">Cabbage</Select.Item>
        </Select.Group>
      </Select>
    );
  },
};

export const GroupsWithIndent: Story = {
  render: params => {
    const [value, onChange] = useState('');

    return (
      <Select {...params} value={value} onChange={onChange}>
        <Select.Group title="Fruits">
          <Select.Item value="item_1" indent={1}>
            Apple
          </Select.Item>
          <Select.Item value="item_2" indent={2}>
            Orange
          </Select.Item>
        </Select.Group>
        <Select.Group title="Vegetables">
          <Select.Item value="item_3" indent={1}>
            Cucumber
          </Select.Item>
          <Select.Item value="item_4" indent={2}>
            Cabbage
          </Select.Item>
        </Select.Group>
      </Select>
    );
  },
};

export const CustomValueNode: Story = {
  render: params => {
    const [value, onChange] = useState('');

    return (
      <Select
        {...params}
        value={value}
        valueNode={value ? <span style={{ color: 'red' }}>selected: {value}</span> : null}
        onChange={onChange}
      >
        <Select.Item value="Apple">Apple</Select.Item>
        <Select.Item value="Orange">Orange</Select.Item>
        <Select.Item value="Watermelon">Watermelon</Select.Item>
        <Select.Item value="Banana">Banana</Select.Item>
      </Select>
    );
  },
};

export const WithSearch: Story = {
  render: params => {
    const [value, onChange] = useState('');
    const [searchQuery, setSearchQuery] = useState('');

    const fruits = [
      { value: 'apple', label: 'Apple' },
      { value: 'orange', label: 'Orange' },
      { value: 'watermelon', label: 'Watermelon' },
      { value: 'banana', label: 'Banana' },
      { value: 'cherry', label: 'Cherry' },
      { value: 'grape', label: 'Grape' },
      { value: 'pineapple', label: 'Pineapple' },
      { value: 'strawberry', label: 'Strawberry' },
      { value: 'mango', label: 'Mango' },
      { value: 'kiwi', label: 'Kiwi' },
    ];

    const filteredFruits = fruits.filter(fruit => fruit.label.toLowerCase().includes(searchQuery.toLowerCase()));

    return (
      <Select {...params} value={value} onChange={onChange} onSearch={setSearchQuery}>
        {filteredFruits.map(fruit => (
          <Select.Item key={fruit.value} value={fruit.value}>
            {fruit.label}
          </Select.Item>
        ))}
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
