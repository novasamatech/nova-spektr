import { type Meta, type StoryObj } from '@storybook/react-vite';
import { useState } from 'react';

import { type Address } from '@/shared/core';
import { WalletType } from '@/shared/core';
import {
  BodyText,
  Button,
  CaptionText,
  FootnoteText,
  HeaderTitleText,
  HelpText,
  Icon,
  IconButton,
  SmallTitleText,
} from '@/shared/ui';
import { Hash, Identicon } from '@/shared/ui-entities';
import { Accordion, Modal, Select } from '@/shared/ui-kit';

import { InlineChainTitle, MOCK_ADDRESSES, StatusPill, WalletIconWithBadge } from './_shared';

type VerificationStatus = 'verified' | 'not_verified' | 'not_verified_no_wallet' | 'verify_pending';

type Delegation = {
  id: string;
  delegatorAddress: Address;
  delegatorWalletName: string;
  delegatorWalletType: WalletType | null;
  proxyType: 'Any' | 'NonTransfer' | 'Governance' | 'Staking';
  chainName: 'Polkadot' | 'Kusama';
  deposit: string;
  status: VerificationStatus;
  pendingOperation?: {
    callHash: string;
    signed: number;
    threshold: number;
    createdAt: string;
  };
  lastOperation: {
    title: string;
    txHash: string;
    timestamp: string;
    blockNumber: string;
  } | null;
};

const INITIAL_DELEGATIONS: Delegation[] = [
  {
    id: '1',
    delegatorAddress: MOCK_ADDRESSES.alice,
    delegatorWalletName: 'Alice Main Vault',
    delegatorWalletType: WalletType.POLKADOT_VAULT,
    proxyType: 'Any',
    chainName: 'Polkadot',
    deposit: '20.08 DOT',
    status: 'verified',
    lastOperation: {
      title: 'Balance transfer to Bob',
      txHash: '0x8a3f9b2c1d4e5f6a7b8c9d0e1f2a3b4c5d6e7f8a9b0c1d2e3f4a5b6c7d8e9f0a',
      timestamp: '2026-04-07 14:32 UTC',
      blockNumber: '24 891 204',
    },
  },
  {
    id: '2',
    delegatorAddress: MOCK_ADDRESSES.bob,
    delegatorWalletName: 'Bob Multisig 2/3',
    delegatorWalletType: WalletType.MULTISIG,
    proxyType: 'Any',
    chainName: 'Polkadot',
    deposit: '20.08 DOT',
    status: 'not_verified',
    lastOperation: {
      title: 'system.remark',
      txHash: '0x1f2a3b4c5d6e7f8a9b0c1d2e3f4a5b6c7d8e9f0a8a3f9b2c1d4e5f6a7b8c9d0e',
      timestamp: '2026-04-06 09:18 UTC',
      blockNumber: '24 876 019',
    },
  },
  {
    id: '3',
    delegatorAddress: MOCK_ADDRESSES.charlie,
    delegatorWalletName: '',
    delegatorWalletType: null,
    proxyType: 'Staking',
    chainName: 'Kusama',
    deposit: '0.668 KSM',
    status: 'not_verified_no_wallet',
    lastOperation: {
      title: 'Nominate validators',
      txHash: '0xabc9d0e1f2a3b4c5d6e7f8a9b0c1d2e3f4a5b6c7d8e9f0a8a3f9b2c1d4e5f6a7',
      timestamp: '2026-04-05 21:04 UTC',
      blockNumber: '24 860 113',
    },
  },
];

const StatusBadge = ({ status }: { status: VerificationStatus }) => {
  if (status === 'verified') {
    return (
      <span className="inline-flex items-center gap-x-1 rounded-[20px] bg-badge-background px-2 py-0.5">
        <Icon name="checkmarkOutline" size={12} className="text-icon-positive" />
        <CaptionText className="text-text-positive uppercase">Verified</CaptionText>
      </span>
    );
  }

  if (status === 'verify_pending') {
    return (
      <span className="inline-flex items-center gap-x-1 rounded-[20px] bg-badge-background px-2 py-0.5">
        <Icon name="hourglass" size={12} className="text-icon-accent" />
        <CaptionText className="text-tab-text-accent uppercase">Verify in pending</CaptionText>
      </span>
    );
  }

  return (
    <span className="inline-flex items-center gap-x-1 rounded-[20px] bg-badge-background px-2 py-0.5">
      <Icon name="warn" size={12} className="text-icon-warning" />
      <CaptionText className="text-text-warning uppercase">Not verified</CaptionText>
    </span>
  );
};

const DelegationRow = ({
  delegation,
  onVerify,
  onRemove,
}: {
  delegation: Delegation;
  onVerify: (id: string) => void;
  onRemove: (id: string) => void;
}) => {
  const {
    status,
    delegatorWalletType,
    delegatorWalletName,
    delegatorAddress,
    proxyType,
    chainName,
    deposit,
    lastOperation,
    pendingOperation,
  } = delegation;

  const hasWallet = status !== 'not_verified_no_wallet';

  const headerRow = (
    <div className="flex h-[64px] w-full items-center gap-x-3 px-4 py-2">
      <div className="flex w-[300px] shrink-0 items-center gap-x-2">
        {hasWallet && delegatorWalletType ? (
          <WalletIconWithBadge
            type={delegatorWalletType}
            badgeColor={
              status === 'verified'
                ? 'bg-icon-positive'
                : status === 'verify_pending'
                  ? 'bg-icon-accent'
                  : 'bg-icon-warning'
            }
          />
        ) : (
          <Identicon address={delegatorAddress} size={32} background={false} />
        )}
        <div className="flex min-w-0 flex-col">
          {hasWallet ? (
            <BodyText className="truncate text-text-primary">{delegatorWalletName}</BodyText>
          ) : (
            <BodyText className="truncate text-text-tertiary italic">Wallet not added locally</BodyText>
          )}
          <HelpText className="truncate text-text-tertiary">
            <Hash value={delegatorAddress} variant="truncate" />
          </HelpText>
        </div>
      </div>

      <div className="flex w-[130px] shrink-0 flex-col">
        <InlineChainTitle chainName={chainName} />
        <HelpText className="text-text-tertiary">Deposit {deposit}</HelpText>
      </div>

      <div className="flex w-[110px] shrink-0 items-center">
        <span className="inline-flex items-center rounded-[20px] border border-filter-border px-2 py-0.5">
          <CaptionText className="text-text-secondary uppercase">{proxyType}</CaptionText>
        </span>
      </div>

      <div className="flex flex-1 items-center justify-end gap-x-2">
        <StatusBadge status={status} />
        <IconButton
          name="delete"
          className="text-icon-default opacity-0 group-hover:opacity-100 hover:text-text-negative"
          onClick={(event) => {
            event.stopPropagation();
            onRemove(delegation.id);
          }}
        />
      </div>
    </div>
  );

  return (
    <div className="group rounded bg-block-background-default hover:shadow-card-shadow">
      <Accordion initialOpen={status !== 'verified'}>
        <Accordion.Trigger>{headerRow}</Accordion.Trigger>

        <Accordion.Content>
          <div className="border-t border-divider p-4">
            <div className="flex flex-col gap-y-3">
              {status === 'verified' && lastOperation ? (
                <div className="flex flex-col gap-y-2">
                  <div className="flex items-center justify-between">
                    <SmallTitleText className="text-text-primary">Verified by operation</SmallTitleText>
                    <FootnoteText className="text-text-tertiary">from Subquery</FootnoteText>
                  </div>
                  <div className="flex items-center gap-x-2">
                    <Icon name="checkmarkOutline" size={16} className="text-icon-positive" />
                    <BodyText className="text-text-primary">{lastOperation.title}</BodyText>
                  </div>
                  <div className="flex flex-col gap-y-1.5 rounded bg-input-background p-3">
                    <div className="flex items-center justify-between gap-x-4">
                      <FootnoteText className="text-text-tertiary">Tx hash</FootnoteText>
                      <FootnoteText className="truncate text-text-secondary">
                        <Hash value={lastOperation.txHash} variant="truncate" />
                      </FootnoteText>
                    </div>
                    <div className="flex items-center justify-between gap-x-4">
                      <FootnoteText className="text-text-tertiary">Block</FootnoteText>
                      <FootnoteText className="text-text-secondary">#{lastOperation.blockNumber}</FootnoteText>
                    </div>
                    <div className="flex items-center justify-between gap-x-4">
                      <FootnoteText className="text-text-tertiary">Time point</FootnoteText>
                      <div className="flex items-center gap-x-1">
                        <FootnoteText className="text-text-secondary">{lastOperation.blockNumber}-1</FootnoteText>
                        <IconButton name="link" className="text-icon-default" onClick={() => {}} />
                      </div>
                    </div>
                  </div>
                </div>
              ) : status === 'verify_pending' && pendingOperation ? (
                <div className="flex flex-col gap-y-2">
                  <div className="flex items-center justify-between">
                    <SmallTitleText className="text-text-primary">Verification in progress</SmallTitleText>
                    <FootnoteText className="text-text-tertiary">Multisig operation</FootnoteText>
                  </div>
                  <div className="flex items-center gap-x-2">
                    <Icon name="hourglass" size={16} className="text-icon-accent" />
                    <BodyText className="text-text-primary">system.remark</BodyText>
                    <span className="ml-1 inline-flex items-center rounded-[20px] bg-badge-background px-2 py-0.5">
                      <CaptionText className="text-tab-text-accent uppercase">
                        {pendingOperation.signed} of {pendingOperation.threshold} signed
                      </CaptionText>
                    </span>
                  </div>
                  <div className="flex flex-col gap-y-1.5 rounded bg-input-background p-3">
                    <div className="flex items-center justify-between gap-x-4">
                      <FootnoteText className="text-text-tertiary">Call hash</FootnoteText>
                      <FootnoteText className="truncate text-text-secondary">
                        <Hash value={pendingOperation.callHash} variant="truncate" />
                      </FootnoteText>
                    </div>
                    <div className="flex items-center justify-between gap-x-4">
                      <FootnoteText className="text-text-tertiary">Created</FootnoteText>
                      <FootnoteText className="text-text-secondary">{pendingOperation.createdAt}</FootnoteText>
                    </div>
                  </div>
                  <div className="mt-1 flex items-center gap-x-2">
                    <Button size="sm" pallet="secondary" variant="fill">
                      Open in Operations
                    </Button>
                    <FootnoteText className="text-text-tertiary">
                      Status will switch to verified once the multisig threshold is reached and the transaction is
                      executed on-chain.
                    </FootnoteText>
                  </div>
                </div>
              ) : status === 'not_verified' ? (
                <div className="flex items-start gap-x-2">
                  <Icon name="warn" size={16} className="mt-0.5 shrink-0 text-icon-warning" />
                  <div className="flex flex-col gap-y-1">
                    <FootnoteText className="text-text-secondary">
                      This delegation has not been verified yet. Verify will submit a{' '}
                      <span className="text-text-primary">system.remark</span> transaction signed from this address
                      through the proxy.
                      {delegatorWalletType === WalletType.MULTISIG ? (
                        <>
                          {' '}
                          Since the delegator is a <span className="text-text-primary">multisig wallet</span>, the
                          verification will be created as a multisig proposal and will require the required number of
                          signatories to approve it before it is executed.
                        </>
                      ) : null}
                    </FootnoteText>
                    <div className="mt-2 flex items-center gap-x-2">
                      <Button
                        size="sm"
                        pallet="primary"
                        prefixElement={<Icon name="checkmark" size={14} className="text-white" />}
                        onClick={() => onVerify(delegation.id)}
                      >
                        Verify
                      </Button>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="flex items-start gap-x-2 rounded bg-badge-background p-3">
                  <Icon name="warn" size={16} className="mt-0.5 shrink-0 text-icon-warning" />
                  <div className="flex flex-col gap-y-1">
                    <BodyText className="text-text-primary">Delegated wallet is not available</BodyText>
                    <FootnoteText className="text-text-secondary">
                      The wallet that granted this proxy is not added locally. Add the required wallet to verify the
                      delegation yourself, or ask the wallet owner to perform a verification operation.
                    </FootnoteText>
                    <div className="mt-2 flex items-center gap-x-2">
                      <Button
                        size="sm"
                        pallet="secondary"
                        variant="fill"
                        prefixElement={<Icon name="add" size={14} className="text-icon-accent" />}
                      >
                        Add wallet
                      </Button>
                      <Button size="sm" pallet="secondary" variant="text">
                        Copy request link
                      </Button>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        </Accordion.Content>
      </Accordion>
    </div>
  );
};

const ProxyWalletDetailsPrototype = () => {
  const [delegations, setDelegations] = useState(INITIAL_DELEGATIONS);
  const [createOpen, setCreateOpen] = useState(false);
  const [newDelegator, setNewDelegator] = useState('');
  const [newChain, setNewChain] = useState('');
  const [newProxyType, setNewProxyType] = useState('');

  const handleVerify = (id: string) => {
    setDelegations((prev) =>
      prev.map((d) => {
        if (d.id !== id) return d;
        if (d.delegatorWalletType === WalletType.MULTISIG) {
          return {
            ...d,
            status: 'verify_pending',
            pendingOperation: {
              callHash: '0x9b8a7c6d5e4f3a2b1c0d9e8f7a6b5c4d3e2f1a0b9c8d7e6f5a4b3c2d1e0f9a8b',
              signed: 1,
              threshold: 2,
              createdAt: 'Just now',
            },
          };
        }
        return { ...d, status: 'verified' };
      }),
    );
  };

  const handleRemove = (id: string) => {
    setDelegations((prev) => prev.filter((d) => d.id !== id));
  };

  const verifiedCount = delegations.filter((d) => d.status === 'verified').length;

  return (
    <div className="flex min-h-[720px] w-[920px] flex-col bg-main-app-background">
      {/* Modal title bar */}
      <div className="flex items-center justify-between px-5 pt-5 pb-3">
        <HeaderTitleText className="text-text-primary">Wallet details</HeaderTitleText>
        <IconButton name="close" className="text-icon-default" onClick={() => {}} />
      </div>

      {/* Wallet identity row */}
      <div className="flex items-center gap-x-3 px-5 pt-1 pb-4">
        <WalletIconWithBadge type={WalletType.PROXIED} badgeColor="bg-icon-accent" />
        <div className="flex min-w-0 flex-1 flex-col">
          <div className="flex min-w-0 items-center gap-x-2">
            <SmallTitleText className="truncate text-text-primary">My Proxy Account</SmallTitleText>
            <IconButton name="rename" className="text-icon-default" onClick={() => {}} />
            <FootnoteText className="ml-1 text-text-tertiary">$0.006</FootnoteText>
          </div>
          <div className="mt-1 inline-flex items-center gap-x-1.5">
            <Identicon address={MOCK_ADDRESSES.dave} size={16} background={false} />
            <FootnoteText className="text-text-secondary">
              <Hash value={MOCK_ADDRESSES.dave} variant="truncate" />
            </FootnoteText>
            <IconButton name="copy" className="text-icon-default" onClick={() => {}} />
          </div>
        </div>
        <Button pallet="secondary" variant="fill" size="sm">
          Open overview
        </Button>
      </div>

      {/* Action buttons (circular) */}
      <div className="flex items-start justify-center gap-x-12 border-t border-divider px-5 pt-5 pb-5">
        <button type="button" className="flex flex-col items-center gap-y-1.5" onClick={() => setCreateOpen(true)}>
          <span className="flex h-12 w-12 items-center justify-center rounded-full bg-block-background-default">
            <Icon name="addDelegationConfirm" size={20} className="text-icon-accent" />
          </span>
          <FootnoteText className="text-text-secondary">Delegate</FootnoteText>
        </button>
        <button type="button" className="flex flex-col items-center gap-y-1.5">
          <span className="flex h-12 w-12 items-center justify-center rounded-full bg-block-background-default">
            <Icon name="createPureProxy" size={20} className="text-icon-accent" />
          </span>
          <FootnoteText className="text-text-secondary">Create pure proxy</FootnoteText>
        </button>
      </div>

      {/* Combined accounts + delegations */}
      <div className="flex flex-col gap-y-5 border-t border-divider px-5 py-4">
        {/* Delegated wallets section */}
        <div className="flex flex-col gap-y-2">
          <div className="flex items-center justify-between">
            <FootnoteText className="text-text-tertiary uppercase">Delegated wallets</FootnoteText>
            <StatusPill variant="accent" label={`${verifiedCount}/${delegations.length} verified`} />
          </div>

          <div className="flex flex-col gap-y-2">
            {delegations.map((d) => (
              <DelegationRow key={d.id} delegation={d} onVerify={handleVerify} onRemove={handleRemove} />
            ))}
          </div>
        </div>
      </div>

      <Modal isOpen={createOpen} size="md" onToggle={setCreateOpen}>
        <Modal.Title close>Create proxy delegation</Modal.Title>
        <Modal.Content>
          <div className="flex flex-col gap-y-5 px-5 py-4">
            <FootnoteText className="text-text-secondary">
              Bind another wallet as a delegator for this proxy. This will create a new on-chain proxy relation.
            </FootnoteText>

            <div className="flex flex-col gap-y-2">
              <SmallTitleText className="text-text-primary">Delegator wallet</SmallTitleText>
              <Select placeholder="Select wallet" value={newDelegator} onChange={setNewDelegator}>
                <Select.Item value="alice">Alice Main Vault</Select.Item>
                <Select.Item value="bob">Bob Multisig 2/3</Select.Item>
                <Select.Item value="treasury">Treasury Council 3/5</Select.Item>
              </Select>
            </div>

            <div className="flex flex-col gap-y-2">
              <SmallTitleText className="text-text-primary">Network</SmallTitleText>
              <Select placeholder="Select network" value={newChain} onChange={setNewChain}>
                <Select.Item value="polkadot">Polkadot</Select.Item>
                <Select.Item value="kusama">Kusama</Select.Item>
              </Select>
            </div>

            <div className="flex flex-col gap-y-2">
              <SmallTitleText className="text-text-primary">Proxy type</SmallTitleText>
              <Select placeholder="Select proxy type" value={newProxyType} onChange={setNewProxyType}>
                <Select.Item value="Any">Any</Select.Item>
                <Select.Item value="NonTransfer">Non-transfer</Select.Item>
                <Select.Item value="Governance">Governance</Select.Item>
                <Select.Item value="Staking">Staking</Select.Item>
              </Select>
            </div>

            <div className="flex items-start gap-x-2 rounded bg-block-background-default p-3">
              <Icon name="info" size={16} className="mt-0.5 shrink-0 text-icon-accent" />
              <FootnoteText className="text-text-secondary">
                A proxy deposit will be reserved on the delegator account. You can review the fee and deposit on the
                next step.
              </FootnoteText>
            </div>
          </div>
        </Modal.Content>
        <Modal.Footer>
          <Button pallet="secondary" variant="fill" onClick={() => setCreateOpen(false)}>
            Cancel
          </Button>
          <Button onClick={() => setCreateOpen(false)}>Continue</Button>
        </Modal.Footer>
      </Modal>
    </div>
  );
};

const meta: Meta<typeof ProxyWalletDetailsPrototype> = {
  component: ProxyWalletDetailsPrototype,
  title: 'Prototypes/WalletDetailsProxy',
  parameters: { layout: 'centered' },
};

export default meta;
type Story = StoryObj<typeof ProxyWalletDetailsPrototype>;
export const Default: Story = {};
