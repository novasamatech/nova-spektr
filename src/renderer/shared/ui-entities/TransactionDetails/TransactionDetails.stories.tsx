import { type Meta, type StoryObj } from '@storybook/react';

import {
  createBaseAccount,
  createPolkadotWallet,
  createProxiedAccount,
  createProxiedWallet,
  createWcAccount,
  createWcWallet,
  polkadotChain,
} from '@/shared/mocks';
import { DetailRow } from '@/shared/ui';
import { Box } from '@/shared/ui-kit';

import { TransactionDetails } from './TransactionDetails';

const initiatorAccount = createBaseAccount('1');
const secondAccount = createBaseAccount('2');
const proxyAccount = createProxiedAccount('1');
const signatoryAccount = createWcAccount('1');

const meta: Meta<typeof TransactionDetails> = {
  title: 'Design System/entities/TransactionDetails',
  component: TransactionDetails,
  args: {
    chain: polkadotChain,
  },
  decorators: [
    Story => (
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
    wallets: [createPolkadotWallet(1, [initiatorAccount]), createProxiedWallet(1, [proxyAccount])],
    initiator: [initiatorAccount],
  },
};

export const Multishard: Story = {
  args: {
    wallets: [createPolkadotWallet(1, [initiatorAccount, secondAccount])],
    initiator: [initiatorAccount, secondAccount],
  },
};

export const Proxied: Story = {
  args: {
    wallets: [createPolkadotWallet(1, [initiatorAccount, secondAccount]), createProxiedWallet(2, [proxyAccount])],
    initiator: [initiatorAccount],
    proxied: proxyAccount,
  },
};

export const Signatory: Story = {
  args: {
    wallets: [createPolkadotWallet(1, [initiatorAccount]), createWcWallet(2, [signatoryAccount])],
    initiator: [initiatorAccount],
    signatory: signatoryAccount,
  },
};

export const ProxiedAndSignatory: Story = {
  args: {
    wallets: [
      createPolkadotWallet(1, [initiatorAccount]),
      createProxiedWallet(2, [proxyAccount]),
      createWcWallet(2, [signatoryAccount]),
    ],
    initiator: [initiatorAccount],
    signatory: signatoryAccount,
    proxied: proxyAccount,
  },
};

export const AdditionalContent: Story = {
  args: {
    wallets: [
      createPolkadotWallet(1, [initiatorAccount]),
      createWcWallet(3, [signatoryAccount]),
      createProxiedWallet(2, [proxyAccount]),
    ],
    initiator: [initiatorAccount],
    signatory: signatoryAccount,
    proxied: proxyAccount,
    children: (
      <>
        <DetailRow label="Referendum">#1234</DetailRow>
        <DetailRow label="Vote">Aye</DetailRow>
        <DetailRow label="Fee">0.0134 DOT</DetailRow>
      </>
    ),
  },
};
