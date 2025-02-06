import { type Meta, type StoryObj } from '@storybook/react';
import { noop } from 'lodash';

import { type MultisigWallet } from '@/shared/core';
import { FootnoteText, IconButton } from '@/shared/ui';
import { ChainIcon } from '@/entities/chain';

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
        src="https://raw.githubusercontent.com/novasamatech/nova-spektr-utils/main/icons/v1/chains/Polkadot.svg"
        size={16}
      />
    ),
  },
};

export const WithDescription: Story = {
  args: {
    meta: <span className="h-1.5 w-1.5 rounded-full bg-icon-positive" />,
    description: <FootnoteText className="text-footnote text-text-tertiary">1000 $</FootnoteText>,
  },
};
