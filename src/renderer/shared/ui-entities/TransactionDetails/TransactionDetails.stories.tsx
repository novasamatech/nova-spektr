import { type Meta, type StoryObj } from '@storybook/react';

import {
  createAccountId,
  createPolkadotWallet,
  createProxiedAccount,
  createProxiedWallet,
  createVaultChainAccount,
  createWcAccount,
  createWcWallet,
  polkadotChain,
} from '@/shared/mocks';
import { DetailRow } from '@/shared/ui';
import { Box } from '@/shared/ui-kit';

import { TransactionDetails } from './TransactionDetails';

const rootAccountId = createAccountId('rootAccountId');
const initiatorAccount = createVaultChainAccount('1', { walletId: 1, derivationPath: '//dot/1' });
const secondAccount = createVaultChainAccount('2', { walletId: 1, derivationPath: '//dot/2' });
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
    wallets: [
      createPolkadotWallet(1, { rootAccountId, accounts: [initiatorAccount] }),
      createProxiedWallet(1, [proxyAccount]),
    ],
    initiators: [initiatorAccount],
  },
};

export const Multishard: Story = {
  args: {
    wallets: [createPolkadotWallet(1, { rootAccountId, accounts: [initiatorAccount, secondAccount] })],
    initiators: [initiatorAccount, secondAccount],
  },
};

export const Proxied: Story = {
  args: {
    wallets: [
      createPolkadotWallet(1, { rootAccountId, accounts: [initiatorAccount, secondAccount] }),
      createProxiedWallet(2, [proxyAccount]),
    ],
    initiators: [initiatorAccount],
    proxied: proxyAccount,
  },
};

export const Signatory: Story = {
  args: {
    wallets: [
      createPolkadotWallet(1, { rootAccountId, accounts: [initiatorAccount] }),
      createWcWallet(2, [signatoryAccount]),
    ],
    initiators: [initiatorAccount],
    signatory: signatoryAccount,
  },
};

export const ProxiedAndSignatory: Story = {
  args: {
    wallets: [
      createPolkadotWallet(1, { rootAccountId, accounts: [initiatorAccount] }),
      createProxiedWallet(2, [proxyAccount]),
      createWcWallet(2, [signatoryAccount]),
    ],
    initiators: [initiatorAccount],
    signatory: signatoryAccount,
    proxied: proxyAccount,
  },
};

export const AdditionalContent: Story = {
  args: {
    wallets: [
      createPolkadotWallet(1, { rootAccountId, accounts: [initiatorAccount] }),
      createWcWallet(3, [signatoryAccount]),
      createProxiedWallet(2, [proxyAccount]),
    ],
    initiators: [initiatorAccount],
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
