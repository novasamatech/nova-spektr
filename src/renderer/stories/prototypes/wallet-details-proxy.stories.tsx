import { type Meta, type StoryObj } from '@storybook/react-vite';
import { useState } from 'react';

import { type Address } from '@/shared/core';
import { WalletType } from '@/shared/core';
import {
  BodyText,
  Button,
  CaptionText,
  FootnoteText,
  HeadlineText,
  HelpText,
  Icon,
  IconButton,
  Separator,
  SmallTitleText,
  TitleText,
} from '@/shared/ui';
import { Hash, Identicon } from '@/shared/ui-entities';
import { Accordion, Box, Input, Modal, Select, Tabs } from '@/shared/ui-kit';

import { CreateNewButton, InlineChainTitle, MOCK_ADDRESSES, StatusPill, WalletIconWithBadge } from './_shared';

type VerificationStatus = 'verified' | 'not_verified' | 'not_verified_no_wallet';

type Delegation = {
  id: string;
  delegatorAddress: Address;
  delegatorWalletName: string;
  delegatorWalletType: WalletType | null;
  proxyType: 'Any' | 'NonTransfer' | 'Governance' | 'Staking';
  chainName: 'Polkadot' | 'Kusama';
  status: VerificationStatus;
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
    proxyType: 'Governance',
    chainName: 'Polkadot',
    status: 'not_verified',
    lastOperation: {
      title: 'Vote on referendum #1204',
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
  onEdit,
}: {
  delegation: Delegation;
  onVerify: (id: string) => void;
  onEdit: (id: string) => void;
}) => {
  const { status, delegatorWalletType, delegatorWalletName, delegatorAddress, proxyType, chainName, lastOperation } =
    delegation;

  const hasWallet = status !== 'not_verified_no_wallet';

  return (
    <div className="rounded bg-block-background-default hover:shadow-card-shadow">
      <Accordion initialOpen={status !== 'verified'}>
        <Accordion.Trigger>
          <div className="flex h-[64px] w-full items-center gap-x-3 px-4 py-2">
            <div className="flex w-[300px] shrink-0 items-center gap-x-2">
              {hasWallet && delegatorWalletType ? (
                <WalletIconWithBadge
                  type={delegatorWalletType}
                  badgeColor={status === 'verified' ? 'bg-icon-positive' : 'bg-icon-warning'}
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

            <div className="flex w-[130px] shrink-0 items-center">
              <InlineChainTitle chainName={chainName} />
            </div>

            <div className="flex w-[110px] shrink-0 items-center">
              <span className="inline-flex items-center rounded-[20px] border border-filter-border px-2 py-0.5">
                <CaptionText className="text-text-secondary uppercase">{proxyType}</CaptionText>
              </span>
            </div>

            <div className="flex flex-1 items-center justify-end gap-x-2">
              <StatusBadge status={status} />
              <IconButton
                name="edit"
                className="text-icon-default"
                onClick={(event) => {
                  event.stopPropagation();
                  onEdit(delegation.id);
                }}
              />
            </div>
          </div>
        </Accordion.Trigger>

        <Accordion.Content>
          <div className="border-t border-divider p-4">
            <div className="flex flex-col gap-y-3">
              {status === 'verified' && lastOperation ? (
                <>
                  <div className="flex items-center justify-between">
                    <SmallTitleText className="text-text-primary">Last operation via delegated wallet</SmallTitleText>
                    <FootnoteText className="text-text-tertiary">from Subquery</FootnoteText>
                  </div>
                  <Box direction="column" gap={2}>
                    <div className="flex items-center gap-x-2">
                      <Icon name="transferConfirm" size={16} className="text-icon-accent" />
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
                        <FootnoteText className="text-text-tertiary">Timestamp</FootnoteText>
                        <FootnoteText className="text-text-secondary">{lastOperation.timestamp}</FootnoteText>
                      </div>
                    </div>
                  </Box>
                  <Separator />
                </>
              ) : null}

              {status === 'verified' ? (
                <div className="flex items-center gap-x-2">
                  <Icon name="checkmarkOutline" size={16} className="text-icon-positive" />
                  <FootnoteText className="text-text-secondary">
                    Operation signature matches this proxy. Delegation is verified.
                  </FootnoteText>
                </div>
              ) : status === 'not_verified' ? (
                <div className="flex items-start justify-between gap-x-4">
                  <div className="flex min-w-0 items-start gap-x-2">
                    <Icon name="warn" size={16} className="mt-0.5 text-icon-warning" />
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
                  </div>
                  <div className="shrink-0">
                    <Button
                      size="sm"
                      pallet="primary"
                      prefixElement={<Icon name="checkmark" size={14} className="text-white" />}
                      onClick={() => onVerify(delegation.id)}
                    >
                      <span className="whitespace-nowrap">Verify via proxy</span>
                    </Button>
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

const OTHER_MULTISIGS = [
  { id: 'ms-a', name: 'Treasury Council 3/5' },
  { id: 'ms-b', name: 'Ops Multisig 2/4' },
  { id: 'ms-c', name: 'Engineering 4/7' },
];

type SignatoryDraft = { id: string; name: string; address: Address };

const INITIAL_SIGNATORIES: SignatoryDraft[] = [
  { id: 's1', name: 'Alice', address: MOCK_ADDRESSES.alice },
  { id: 's2', name: 'Bob', address: MOCK_ADDRESSES.bob },
  { id: 's3', name: 'Charlie', address: MOCK_ADDRESSES.charlie },
];

const EditDelegationModal = ({
  delegation,
  isOpen,
  onClose,
  onRemove,
}: {
  delegation: Delegation | null;
  isOpen: boolean;
  onClose: () => void;
  onRemove: (id: string) => void;
}) => {
  const [signatories, setSignatories] = useState(INITIAL_SIGNATORIES);
  const [threshold, setThreshold] = useState('2');
  const [replaceWith, setReplaceWith] = useState('');

  if (!delegation) return null;

  const isMultisig = delegation.delegatorWalletType === WalletType.MULTISIG;

  return (
    <Modal isOpen={isOpen} size="md" onToggle={(open) => !open && onClose()}>
      <Modal.Title close>Edit delegation</Modal.Title>
      <Modal.Content>
        <div className="flex flex-col gap-y-5 px-5 py-4">
          {/* Header summary */}
          <div className="flex items-center gap-x-3 rounded bg-block-background-default p-3">
            {delegation.delegatorWalletType ? (
              <WalletIconWithBadge type={delegation.delegatorWalletType} badgeColor="bg-icon-accent" />
            ) : (
              <Identicon address={delegation.delegatorAddress} size={32} background={false} />
            )}
            <div className="flex min-w-0 flex-col">
              <BodyText className="truncate text-text-primary">
                {delegation.delegatorWalletName || 'Unnamed wallet'}
              </BodyText>
              <HelpText className="truncate text-text-tertiary">
                <Hash value={delegation.delegatorAddress} variant="truncate" />
              </HelpText>
            </div>
          </div>

          {isMultisig ? (
            <>
              {/* Signatories editor */}
              <div className="flex flex-col gap-y-2">
                <SmallTitleText className="text-text-primary">Signatories</SmallTitleText>
                <FootnoteText className="text-text-tertiary">
                  Add or remove signatories of the delegated multisig wallet.
                </FootnoteText>
                <div className="flex flex-col gap-y-2">
                  {signatories.map((s) => (
                    <div
                      key={s.id}
                      className="flex items-center justify-between gap-x-2 rounded bg-input-background px-3 py-2"
                    >
                      <div className="flex min-w-0 items-center gap-x-2">
                        <Identicon address={s.address} size={20} background={false} />
                        <BodyText className="truncate text-text-primary">{s.name}</BodyText>
                        <HelpText className="truncate text-text-tertiary">
                          <Hash value={s.address} variant="truncate" />
                        </HelpText>
                      </div>
                      <IconButton
                        name="delete"
                        className="text-icon-default"
                        onClick={() => setSignatories((prev) => prev.filter((p) => p.id !== s.id))}
                      />
                    </div>
                  ))}
                </div>
                <div>
                  <Button
                    size="sm"
                    pallet="secondary"
                    variant="fill"
                    prefixElement={<Icon name="add" size={14} className="text-icon-accent" />}
                    onClick={() =>
                      setSignatories((prev) => [
                        ...prev,
                        {
                          id: `s${prev.length + 1}`,
                          name: `Signatory ${prev.length + 1}`,
                          address: MOCK_ADDRESSES.eve,
                        },
                      ])
                    }
                  >
                    Add signatory
                  </Button>
                </div>
              </div>

              {/* Threshold */}
              <div className="flex flex-col gap-y-2">
                <SmallTitleText className="text-text-primary">Approval threshold</SmallTitleText>
                <div className="flex items-center gap-x-2">
                  <div className="w-[120px]">
                    <Input value={threshold} placeholder="2" onChange={setThreshold} />
                  </div>
                  <FootnoteText className="text-text-tertiary">of {signatories.length} signatories</FootnoteText>
                </div>
              </div>

              <Separator />

              {/* Replace multisig */}
              <div className="flex flex-col gap-y-2">
                <SmallTitleText className="text-text-primary">Replace with another multisig</SmallTitleText>
                <FootnoteText className="text-text-tertiary">
                  Detach this delegation and bind it to a different multisig wallet from your list.
                </FootnoteText>
                <Select placeholder="Select multisig wallet" value={replaceWith} onChange={setReplaceWith}>
                  {OTHER_MULTISIGS.map((m) => (
                    <Select.Item key={m.id} value={m.id}>
                      {m.name}
                    </Select.Item>
                  ))}
                </Select>
              </div>
            </>
          ) : (
            <FootnoteText className="text-text-secondary">
              This delegation is bound to a regular wallet. Editing is limited to removing the delegation.
            </FootnoteText>
          )}

          <Separator />

          {/* Danger zone */}
          <div className="flex flex-col gap-y-2 rounded bg-badge-background p-3">
            <BodyText className="text-text-primary">Remove delegation</BodyText>
            <FootnoteText className="text-text-secondary">
              The link between this proxy and the delegator wallet will be removed locally. The on-chain proxy itself is
              not affected.
            </FootnoteText>
            <div>
              <Button
                size="sm"
                pallet="error"
                variant="fill"
                prefixElement={<Icon name="delete" size={14} className="text-white" />}
                onClick={() => {
                  onRemove(delegation.id);
                  onClose();
                }}
              >
                Remove delegation
              </Button>
            </div>
          </div>
        </div>
      </Modal.Content>
      <Modal.Footer>
        <Button pallet="secondary" variant="fill" onClick={onClose}>
          Cancel
        </Button>
        <Button onClick={onClose}>Save changes</Button>
      </Modal.Footer>
    </Modal>
  );
};

const ProxyWalletDetailsPrototype = () => {
  const [tab, setTab] = useState('delegations');
  const [delegations, setDelegations] = useState(INITIAL_DELEGATIONS);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [createOpen, setCreateOpen] = useState(false);
  const [newDelegator, setNewDelegator] = useState('');
  const [newChain, setNewChain] = useState('');
  const [newProxyType, setNewProxyType] = useState('');

  const handleVerify = (id: string) => {
    setDelegations((prev) => prev.map((d) => (d.id === id ? { ...d, status: 'verified' } : d)));
  };

  const handleRemove = (id: string) => {
    setDelegations((prev) => prev.filter((d) => d.id !== id));
  };

  const editingDelegation = delegations.find((d) => d.id === editingId) ?? null;

  const proxyAddress = MOCK_ADDRESSES.dave;
  const verifiedCount = delegations.filter((d) => d.status === 'verified').length;

  return (
    <div className="flex min-h-[720px] w-[880px] flex-col bg-main-app-background">
      {/* Modal header */}
      <div className="flex items-start justify-between border-b border-container-border bg-top-nav-bar-background px-5 pt-5 pb-4">
        <div className="flex items-center gap-x-3">
          <WalletIconWithBadge type={WalletType.PROXIED} badgeColor="bg-icon-accent" />
          <div className="flex flex-col">
            <TitleText className="text-text-primary">My Proxy Account</TitleText>
            <div className="mt-0.5 inline-flex items-center gap-x-1">
              <Identicon address={proxyAddress} size={14} background={false} />
              <HelpText className="text-text-tertiary">
                <Hash value={proxyAddress} variant="truncate" />
              </HelpText>
            </div>
          </div>
        </div>
        <div className="flex items-center gap-x-1">
          <IconButton name="rename" className="text-icon-default" onClick={() => {}} />
          <IconButton name="close" className="text-icon-default" onClick={() => {}} />
        </div>
      </div>

      {/* Proxy info banner */}
      <div className="mx-5 mt-4 flex items-center gap-x-2 rounded bg-block-background-default px-3 py-2">
        <Icon name="proxied" size={16} className="text-icon-accent" />
        <FootnoteText className="text-text-secondary">
          This proxy controls {delegations.length} delegated {delegations.length === 1 ? 'wallet' : 'wallets'} —{' '}
          {verifiedCount} verified
        </FootnoteText>
      </div>

      {/* Tabs */}
      <div className="px-5 pt-4">
        <Tabs value={tab} onChange={setTab}>
          <Tabs.List>
            <Tabs.Trigger value="accounts">Accounts</Tabs.Trigger>
            <Tabs.Trigger value="delegations">Delegations</Tabs.Trigger>
          </Tabs.List>

          <Tabs.Content value="accounts">
            <div className="py-6">
              <FootnoteText className="text-text-tertiary">Accounts list (not in scope of this prototype)</FootnoteText>
            </div>
          </Tabs.Content>

          <Tabs.Content value="delegations">
            <div className="flex flex-col gap-y-3 py-4">
              <div className="flex items-center justify-between">
                <HeadlineText className="text-text-primary">Delegated wallets</HeadlineText>
                <StatusPill variant="accent" label={`${verifiedCount}/${delegations.length} verified`} />
              </div>

              <div className="flex flex-col gap-y-2">
                {delegations.map((d) => (
                  <DelegationRow key={d.id} delegation={d} onVerify={handleVerify} onEdit={setEditingId} />
                ))}
              </div>

              <CreateNewButton label="Delegate" onClick={() => setCreateOpen(true)} />
            </div>
          </Tabs.Content>
        </Tabs>
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

      <EditDelegationModal
        delegation={editingDelegation}
        isOpen={editingId !== null}
        onClose={() => setEditingId(null)}
        onRemove={handleRemove}
      />
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
