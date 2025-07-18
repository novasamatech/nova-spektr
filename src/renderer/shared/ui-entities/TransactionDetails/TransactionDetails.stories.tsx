import { type Meta, type StoryObj } from '@storybook/react-vite';

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
const firstShard = createVaultChainAccount('1', { walletId: 1, derivationPath: '//dot/1' });
const secondShard = createVaultChainAccount('2', { walletId: 1, derivationPath: '//dot/2' });
const proxiedAccount = createProxiedAccount('1', 2);
const signatoryAccount = createWcAccount('1', 3);

const pvWallet = createPolkadotWallet(1, { rootAccountId, accounts: [firstShard, secondShard] });
const proxiedWallet = createProxiedWallet(2, [proxiedAccount]);
const signatoryWallet = createWcWallet(3, [signatoryAccount]);

const wallets = [pvWallet, proxiedWallet, signatoryWallet];

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
    wallets,
    initiators: [firstShard],
    signatory: firstShard,
  },
};

export const Multishard: Story = {
  args: {
    wallets,
    initiators: [firstShard, secondShard],
    signatory: firstShard,
  },
};

export const Proxied: Story = {
  args: {
    wallets,
    initiators: [proxiedAccount],
    signatory: firstShard,
  },
};

export const Signatory: Story = {
  args: {
    wallets,
    initiators: [firstShard],
    signatory: signatoryAccount,
  },
};

export const AdditionalContent: Story = {
  args: {
    wallets,
    initiators: [firstShard],
    signatory: signatoryAccount,
    children: (
      <>
        <DetailRow label="Referendum">#1234</DetailRow>
        <DetailRow label="Vote">Aye</DetailRow>
        <DetailRow label="Fee">0.0134 DOT</DetailRow>
      </>
    ),
  },
};
