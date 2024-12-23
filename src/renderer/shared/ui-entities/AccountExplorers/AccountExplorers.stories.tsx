import { type Meta, type StoryObj } from '@storybook/react';

import { type Chain } from '@/shared/core';
import { createAccountId } from '@/shared/mocks';
import { FootnoteText } from '@/shared/ui';

import { AccountExplorers } from './AccountExplorers';

const kusamaChain = {
  name: 'Kusama Asset Hub',
  addressPrefix: 2,
  chainId: '0x48239ef607d7928874027a43a67689209727dfb3d3dc5e5b03a39bdc2eda771a',
  explorers: [
    {
      name: 'Subscan',
      account: 'https://assethub-kusama.subscan.io/account/{address}',
    },
    {
      name: 'Statescan',
      account: 'https://statemine.statescan.io/#/accounts/{address}',
    },
    {
      name: 'Sub.ID',
      account: 'https://sub.id/{address}',
    },
  ],
};

const meta: Meta<typeof AccountExplorers> = {
  title: 'Design System/entities/AccountExplorers',
  component: AccountExplorers,
  args: {
    accountId: createAccountId('account explorers'),
    chain: kusamaChain as Chain,
  },
  parameters: {
    layout: 'centered',
  },
};

export default meta;

type Story = StoryObj<typeof AccountExplorers>;

export const Default: Story = {};

export const WithAdditionalContent: Story = {
  args: {
    children: <FootnoteText className="text-text-secondary">Derivation path: //polkadot//pub</FootnoteText>,
  },
};
