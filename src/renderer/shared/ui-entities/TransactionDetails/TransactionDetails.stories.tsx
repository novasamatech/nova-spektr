import { type Meta, type StoryObj } from '@storybook/react';

import { createBaseAccount, createPolkadotWallet, polkadotChain } from '@/shared/mocks';
import { Box } from '@/shared/ui-kit';
import { DetailRow } from '../../ui';

import { TransactionDetails } from './TransactionDetails';

const initiatorAccount = createBaseAccount(1);
const proxyAccount = createBaseAccount(2);
const signatoryAccount = createBaseAccount(3);

const meta: Meta<typeof TransactionDetails> = {
  title: 'Design System/entities/TransactionDetails',
  component: TransactionDetails,
  args: {
    chain: polkadotChain,
  },
  decorators: [
    (Story) => (
      <Box width="400px">
        <Story />
      </Box>
    ),
  ],
};

export default meta;

type Story = StoryObj<typeof TransactionDetails>;

export const Default: Story = {
  args: {
    wallets: [createPolkadotWallet(1, [initiatorAccount, proxyAccount])],
    initiator: initiatorAccount,
  },
};

export const Proxy: Story = {
  args: {
    wallets: [createPolkadotWallet(1, [initiatorAccount]), createPolkadotWallet(2, [proxyAccount])],
    initiator: initiatorAccount,
    proxy: proxyAccount,
  },
};

export const Signatory: Story = {
  args: {
    wallets: [createPolkadotWallet(1, [initiatorAccount]), createPolkadotWallet(2, [signatoryAccount])],
    initiator: initiatorAccount,
    signatory: signatoryAccount,
  },
};

export const ProxyAndSignatory: Story = {
  args: {
    wallets: [
      createPolkadotWallet(1, [initiatorAccount]),
      createPolkadotWallet(3, [signatoryAccount]),
      createPolkadotWallet(2, [proxyAccount]),
    ],
    initiator: initiatorAccount,
    signatory: signatoryAccount,
    proxy: proxyAccount,
  },
};

export const AdditionalContent: Story = {
  args: {
    wallets: [
      createPolkadotWallet(1, [initiatorAccount]),
      createPolkadotWallet(3, [signatoryAccount]),
      createPolkadotWallet(2, [proxyAccount]),
    ],
    initiator: initiatorAccount,
    signatory: signatoryAccount,
    proxy: proxyAccount,
    children: (
      <>
        <DetailRow label="Referendum">#1234</DetailRow>
        <DetailRow label="Vote">Aye</DetailRow>
        <DetailRow label="Fee">0.0134 DOT</DetailRow>
      </>
    ),
  },
};
