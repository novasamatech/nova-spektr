import { type Meta, type StoryObj } from '@storybook/react';

import { type Chain } from '@/shared/core';
import { FootnoteText } from '@/shared/ui';

import { AccountExplorers } from './AccountExplorers';

const testAccountId = '0x9e9bf57d2420cc050723e9609afd5a1c326aceaf6b3f4175fda2eb26044d1f64';

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
    accountId: testAccountId,
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
