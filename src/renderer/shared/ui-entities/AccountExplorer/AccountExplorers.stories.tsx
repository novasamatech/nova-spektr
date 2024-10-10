import { type Meta, type StoryObj } from '@storybook/react';

import { type Chain } from '@/shared/core';
import { FootnoteText } from '../../ui';

import { AccountExplorers } from './AccountExplorers';

const testAccountId = '0xd180LUV5yfqBC9i8Lfssufw2434ef24f3f7AhBDDcaHEF03a8';
const testChain: Chain = {
  name: 'Polkadot',
  specName: 'polkadot',
  addressPrefix: 0,
  chainId: '0x91b171bb158e2d3848fa23a9f1c25182fb8e20313b2c1eb49219da7a70ce90c3',
  icon: '',
  options: [],
  nodes: [],
  assets: [],
  explorers: [
    {
      name: 'Subscan',
      extrinsic: 'https://polkadot.subscan.io/extrinsic/{hash}',
      account: 'https://polkadot.subscan.io/account/{address}',
      multisig: 'https://polkadot.subscan.io/multisig_extrinsic/{index}?call_hash={callHash}',
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
    chain: testChain,
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
