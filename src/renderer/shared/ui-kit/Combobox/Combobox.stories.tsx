import { type Meta, type StoryObj } from '@storybook/react';
import { noop } from 'lodash';
import { useState } from 'react';

import { Icon } from '@/shared/ui';

import { Combobox } from './Combobox';

const meta: Meta<typeof Combobox> = {
  title: 'Design System/kit/Combobox',
  component: Combobox,
  render: params => {
    const [value, setValue] = useState('');

    return (
      <Combobox {...params} placeholder="Type something ..." value={value} onChange={setValue}>
        {[
          { text: '🍎 Apple', value: 'Apple' },
          { text: '🍇 Grape', value: 'Grape' },
          { text: '🍊 Orange', value: 'Orange' },
          { text: '🍓 Strawberry', value: 'Strawberry' },
          { text: '🍉 Watermelon', value: 'Watermelon' },
        ].map(item => (
          <Combobox.Item key={item.text} value={item.value}>
            {item.text}
          </Combobox.Item>
        ))}
      </Combobox>
    );
  },
};

export default meta;

type Story = StoryObj<typeof Combobox>;

export const Default: Story = {};

export const Small: Story = {
  args: {
    height: 'sm',
  },
};

export const Disabled: Story = {
  args: {
    disabled: true,
  },
};

export const Invalid: Story = {
  args: {
    invalid: true,
  },
};

export const Groups: Story = {
  render: () => {
    const [value, setValue] = useState('');

    return (
      <Combobox placeholder="Type something ..." value={value} onChange={setValue} onInput={noop}>
        <Combobox.Group title="Group 1">
          {[
            { text: '🍎 Apple', value: 'Apple' },
            { text: '🍇 Grape', value: 'Grape' },
          ].map(item => (
            <Combobox.Item key={item.text} value={item.value}>
              {item.text}
            </Combobox.Item>
          ))}
        </Combobox.Group>
        <Combobox.Group title="Group 2">
          {[
            { text: '🍊 Orange', value: 'Orange' },
            { text: '🍓 Strawberry', value: 'Strawberry' },
            { text: '🍉 Watermelon', value: 'Watermelon' },
          ].map(item => (
            <Combobox.Item key={item.text} value={item.value}>
              {item.text}
            </Combobox.Item>
          ))}
        </Combobox.Group>
      </Combobox>
    );
  },
};

export const NestedGroups: Story = {
  render: () => {
    const [value, setValue] = useState('');

    return (
      <Combobox placeholder="Type something ..." value={value} onChange={setValue} onInput={noop}>
        <Combobox.Group title="Group 1">
          <Combobox.Group
            title={
              <div className="flex items-center gap-x-1">
                <Icon name="usd" size={16} />
                <span>Usd subgroup</span>
              </div>
            }
          >
            {[
              { text: 'Item 1', value: 'Item 1' },
              { text: 'Item 2', value: 'Item 2' },
            ].map(item => (
              <Combobox.Item key={item.text} value={item.value}>
                {item.text}
              </Combobox.Item>
            ))}
          </Combobox.Group>
          <Combobox.Group
            title={
              <div className="flex items-center gap-x-1">
                <Icon name="eur" size={16} />
                <span>EUR subgroup</span>
              </div>
            }
          >
            {[
              { text: 'Item 3', value: 'Item 3' },
              { text: 'Item 4', value: 'Item 4' },
            ].map(item => (
              <Combobox.Item key={item.text} value={item.value}>
                {item.text}
              </Combobox.Item>
            ))}
          </Combobox.Group>
        </Combobox.Group>
      </Combobox>
    );
  },
};
