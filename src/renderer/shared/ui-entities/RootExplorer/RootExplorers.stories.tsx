import { type Meta, type StoryObj } from '@storybook/react';

import { FootnoteText } from '@/shared/ui';

import { RootExplorers } from './RootExplorers';

const testAccountId = '0x9e9bf57d2420cc050723e9609afd5a1c326aceaf6b3f4175fda2eb26044d1f64';

const meta: Meta<typeof RootExplorers> = {
  title: 'Design System/entities/RootExplorers',
  component: RootExplorers,
  args: {
    accountId: testAccountId,
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
