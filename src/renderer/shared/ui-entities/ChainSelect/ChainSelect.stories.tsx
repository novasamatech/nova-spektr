import { type Meta, type StoryObj } from '@storybook/react-vite';
import { useState } from 'react';

import { kusamaChain, polkadotChain } from '@/shared/mocks';

import { ChainSelect } from './ChainSelect';

const meta: Meta<typeof ChainSelect> = {
  title: 'Design System/entities/ChainSelect',
  component: ChainSelect,
  args: {
    value: null,
    options: [polkadotChain, kusamaChain],
    placeholder: 'Select chain',
  },
  decorators: [
    (Story, { args }) => {
      const [value, onChange] = useState(args.value);

      return <Story args={{ ...args, value, onChange }} />;
    },
  ],
};

export default meta;

type Story = StoryObj<typeof ChainSelect>;

export const Default: Story = {};
