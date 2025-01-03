import { type Meta, type StoryObj } from '@storybook/react';

import { createAccountId } from '@/shared/mocks';
import { FootnoteText } from '@/shared/ui';

import { RootExplorers } from './RootExplorers';

const meta: Meta<typeof RootExplorers> = {
  title: 'Design System/entities/RootExplorers',
  component: RootExplorers,
  args: {
    accountId: createAccountId('root explorers'),
  },
  parameters: {
    layout: 'centered',
  },
};

export default meta;

type Story = StoryObj<typeof RootExplorers>;

export const Default: Story = {};

export const WithAdditionalContent: Story = {
  args: {
    children: <FootnoteText className="text-text-secondary">Derivation path: //polkadot//pub</FootnoteText>,
  },
};
