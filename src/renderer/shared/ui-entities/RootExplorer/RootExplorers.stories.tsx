import { type Meta, type StoryObj } from '@storybook/react';

import { FootnoteText } from '@/shared/ui';

import { RootExplorers } from './RootExplorers';

const testAccountId = '0xd180LUV5yfqBC9i8Lfssufw2434ef24f3f7AhBDDcaHEF03a8';

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
