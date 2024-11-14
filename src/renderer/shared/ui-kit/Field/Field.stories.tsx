import { type Meta, type StoryObj } from '@storybook/react';

import { Field } from './Field';

const meta: Meta<typeof Field> = {
  title: 'Design System/kit/Field',
  component: Field,
};

export default meta;

type Story = StoryObj<typeof Field>;

export const Default: Story = {
  args: {
    text: 'Label name',
    children: <input value="Input value" className="w-52 rounded border border-gray-300 p-2" />,
  },
};
