import { type Meta, type StoryObj } from '@storybook/react';
import { noop } from 'lodash';

import { Combobox } from './Combobox';

const meta: Meta<typeof Combobox> = {
  title: 'Design System/kit/Combobox',
  component: Combobox,
  parameters: {
    layout: 'centered',
  },
  render: (params) => {
    return (
      <Combobox {...params} placeholder="Type something ..." value="" onChange={noop}>
        <Combobox.Content>
          {[
            { text: '🍎 Apple', value: 'Apple' },
            { text: '🍇 Grape', value: 'Grape' },
            { text: '🍊 Orange', value: 'Orange' },
            { text: '🍓 Strawberry', value: 'Strawberry' },
            { text: '🍉 Watermelon', value: 'Watermelon' },
          ].map((item) => (
            <Combobox.Item key={item.text} value={item.value}>
              {item.text}
            </Combobox.Item>
          ))}
        </Combobox.Content>
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
