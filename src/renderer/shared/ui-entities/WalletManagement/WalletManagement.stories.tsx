import { type Meta, type StoryObj } from '@storybook/react-vite';
import { noop } from 'lodash';

import { createWcWallet } from '@/shared/mocks';
import { FootnoteText, IconButton } from '@/shared/ui';
import { ChainIcon } from '../ChainIcon/ChainIcon';

import { WalletManagement } from './WalletManagement';

const meta: Meta<typeof WalletManagement> = {
  title: 'Design System/entities/WalletManagement',
  component: WalletManagement,
  args: {
    wallet: createWcWallet(0, []),
    active: true,
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
    meta: <span className="h-1.5 w-1.5 rounded-full bg-icon-positive" />,
    description: <FootnoteText className="text-footnote text-text-tertiary">1000 $</FootnoteText>,
  },
};
