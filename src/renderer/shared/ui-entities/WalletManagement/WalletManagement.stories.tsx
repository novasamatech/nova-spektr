import { type Meta, type StoryObj } from '@storybook/react-vite';
import { noop } from 'lodash';

import { type MultisigWallet } from '@/shared/core';
import { FootnoteText, IconButton } from '@/shared/ui';
import { ChainIcon } from '../ChainIcon/ChainIcon';

import { WalletManagement } from './WalletManagement';

const meta: Meta<typeof WalletManagement> = {
  title: 'Design System/entities/WalletManagement',
  component: WalletManagement,
  args: {
    wallet: {
      id: 1,
      type: 'wallet_ms',
      name: 'WalletManagement',
      isActive: true,
      accounts: [],
      isHidden: false,
      signingType: 'signing_ms',
    } as MultisigWallet,
    children: <IconButton name="details" onClick={noop} />,
  },
  parameters: {
    layout: 'centered',
  },
};

export default meta;

type Story = StoryObj<typeof WalletManagement>;

export const Default: Story = {};

export const WithMeta: Story = {
  args: {
    meta: (
      <ChainIcon
        chain={{
          chainId: '0x123',
          icon: 'https://raw.githubusercontent.com/novasamatech/nova-spektr-utils/main/icons/v1/chains/Polkadot.svg',
          name: 'Polkadot',
          specName: 'polkadot',
          assets: [],
          nodes: [],
          addressPrefix: 0,
        }}
        size={16}
      />
    ),
  },
};

export const WithDescription: Story = {
  args: {
    meta: <span className="bg-icon-positive h-1.5 w-1.5 rounded-full" />,
    description: <FootnoteText className="text-footnote text-text-tertiary">1000 $</FootnoteText>,
  },
};
