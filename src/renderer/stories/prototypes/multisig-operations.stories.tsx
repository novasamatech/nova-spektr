import { type Meta, type StoryObj } from '@storybook/react-vite';
import { useState } from 'react';

import { type Address, WalletType } from '@/shared/core';
import {
  BodyText,
  Button,
  CaptionText,
  DetailRow,
  FootnoteText,
  HelpText,
  Icon,
  IconButton,
  Separator,
  SmallTitleText,
  TitleText,
} from '@/shared/ui';
import { Hash, Identicon, WalletIcon } from '@/shared/ui-entities';
import { Accordion, Box, Copy, Input, Modal, SearchInput, Select, Surface, Tabs, Tooltip } from '@/shared/ui-kit';

// ─── Mock data ───────────────────────────────────────────────────────────────

const MOCK_ADDRESSES = {
  alice: '5GrwvaEF5zXb26Fz9rcQpDWS57CtERHpNehXCPcNoHGKutQY' as Address,
  bob: '5FHneW46xGXgs5mUiveU4sbTyGBzmstUspZC92UhjJM694ty' as Address,
  charlie: '5GNJqTPyNqANBkUVMN1LPPrxXnFouWA2MRQg3gKrUYgw6J9i' as Address,
  dave: '5DfhGyQdFobKM8NsWvEeAKk5EhQhro4TPAqv3HRfCCUjQcSo' as Address,
};

type MockOperation = {
  id: string;
  txType: string;
  iconName: string;
  chainName: string;
  amount?: string;
  amountUsd?: string;
  account: { name: string; address: Address; walletType?: WalletType };
  signed: number;
  threshold: number;
  status: 'pending' | 'executed' | 'cancelled';
  date: string;
  dateGroup: string;
  callHash: string;
  callData?: string;
  deposit?: string;
  blockCreated?: number;
  indexCreated?: number;
  depositor: { name: string; address: Address };
  recipient?: { address: Address };
  signatories: {
    name: string;
    address: Address;
    walletType?: WalletType;
    signed: boolean;
    isContact?: boolean;
  }[];
  canReject?: boolean;
  canApprove?: boolean;
};

type Draft = {
  id: string;
  multisigId: string;
  multisigName: string;
  description: string;
  callData: string;
  txType: string;
  chainName: string;
  amount: string;
  dest: string;
  createdAt: string;
};

const OPERATIONS: MockOperation[] = [
  {
    id: 'op-1',
    txType: 'Transfer',
    iconName: 'transferMst',
    chainName: 'Polkadot Asset Hub',
    amount: '0.01 DOT',
    amountUsd: '$0.015',
    account: { name: '13Zuh...iMR2j', address: MOCK_ADDRESSES.alice, walletType: WalletType.FLEXIBLE_MULTISIG },
    signed: 1,
    threshold: 2,
    status: 'pending',
    date: '5 Dec 2025, 14:30',
    dateGroup: '5 Dec 2025',
    callHash: '0x8a3f9b2c1d4e5f6a7b8c9d0e1f2a3b4c5d6e7f8a9b0c1d2e3f4a5b6c7d8e9f0a',
    callData:
      '0x040000008eaf04151687736326c9fea17e25fc5287613693c912909cb226aa4794f26a4800ca9a3b0000000000000000000000000000',
    deposit: '0.0267 DOT',
    blockCreated: 18234567,
    indexCreated: 2,
    depositor: { name: 'Polkadot Vault', address: MOCK_ADDRESSES.alice },
    recipient: { address: MOCK_ADDRESSES.bob },
    signatories: [
      { name: 'Polkadot Vault', address: MOCK_ADDRESSES.alice, walletType: WalletType.POLKADOT_VAULT, signed: true },
      { name: 'Watch-only', address: MOCK_ADDRESSES.bob, walletType: WalletType.WATCH_ONLY, signed: false },
      {
        name: 'Dave Contact',
        address: MOCK_ADDRESSES.dave,
        walletType: WalletType.POLKADOT_VAULT,
        signed: false,
        isContact: true,
      },
    ],
    canReject: true,
    canApprove: false,
  },
  {
    id: 'op-2',
    txType: 'Bond',
    iconName: 'startStakingMst',
    chainName: 'Polkadot Asset Hub',
    amount: '1,000 DOT',
    amountUsd: '$4,200',
    account: { name: 'Treasury Msig', address: MOCK_ADDRESSES.bob, walletType: WalletType.MULTISIG },
    signed: 2,
    threshold: 3,
    status: 'pending',
    date: '5 Dec 2025, 10:15',
    dateGroup: '5 Dec 2025',
    callHash: '0x1a2b3c4d5e6f7a8b9c0d1e2f3a4b5c6d7e8f9a0b1c2d3e4f5a6b7c8d9e0f1a2b',
    callData: '0x060000d43593c715fdd31c61141abd04a99fd6822c8558854ccde39a5684e7a56da27d0700e8764817',
    deposit: '0.0534 DOT',
    blockCreated: 18234100,
    indexCreated: 5,
    depositor: { name: 'Treasury Msig', address: MOCK_ADDRESSES.bob },
    signatories: [
      { name: 'Polkadot Vault', address: MOCK_ADDRESSES.alice, walletType: WalletType.POLKADOT_VAULT, signed: true },
      { name: 'Nova Wallet', address: MOCK_ADDRESSES.bob, walletType: WalletType.NOVA_WALLET, signed: true },
      {
        name: 'Charlie Contact',
        address: MOCK_ADDRESSES.charlie,
        walletType: WalletType.WATCH_ONLY,
        signed: false,
        isContact: true,
      },
    ],
    canReject: false,
    canApprove: true,
  },
  {
    id: 'op-3',
    txType: 'Transfer',
    iconName: 'transferMst',
    chainName: 'Kusama',
    amount: '5.5 KSM',
    amountUsd: '$110',
    account: { name: 'Dev Ops', address: MOCK_ADDRESSES.charlie, walletType: WalletType.MULTISIG },
    signed: 3,
    threshold: 3,
    status: 'executed',
    date: '3 Dec 2025, 09:00',
    dateGroup: '3 Dec 2025',
    callHash: '0x4d5e6f7a8b9c0d1e2f3a4b5c6d7e8f9a0b1c2d3e4f5a6b7c8d9e0f1a2b3c4d5e',
    deposit: '0.0133 KSM',
    blockCreated: 21456789,
    indexCreated: 1,
    depositor: { name: 'Dev Ops', address: MOCK_ADDRESSES.charlie },
    recipient: { address: MOCK_ADDRESSES.dave },
    signatories: [
      { name: 'Polkadot Vault', address: MOCK_ADDRESSES.alice, walletType: WalletType.POLKADOT_VAULT, signed: true },
      { name: 'Nova Wallet', address: MOCK_ADDRESSES.bob, walletType: WalletType.NOVA_WALLET, signed: true },
      { name: 'Watch-only', address: MOCK_ADDRESSES.charlie, walletType: WalletType.WATCH_ONLY, signed: true },
    ],
  },
  {
    id: 'op-4',
    txType: 'Add proxy',
    iconName: 'proxyMst',
    chainName: 'Polkadot',
    account: { name: 'Council', address: MOCK_ADDRESSES.dave, walletType: WalletType.MULTISIG },
    signed: 1,
    threshold: 4,
    status: 'cancelled',
    date: '1 Dec 2025, 16:45',
    dateGroup: '1 Dec 2025',
    callHash: '0x9f0a1b2c3d4e5f6a7b8c9d0e1f2a3b4c5d6e7f8a9b0c1d2e3f4a5b6c7d8e9f0a',
    deposit: '0.0267 DOT',
    blockCreated: 18200000,
    indexCreated: 3,
    depositor: { name: 'Council', address: MOCK_ADDRESSES.dave },
    signatories: [
      { name: 'Polkadot Vault', address: MOCK_ADDRESSES.alice, walletType: WalletType.POLKADOT_VAULT, signed: true },
      {
        name: 'Bob Contact',
        address: MOCK_ADDRESSES.bob,
        walletType: WalletType.NOVA_WALLET,
        signed: false,
        isContact: true,
      },
      {
        name: 'Charlie Contact',
        address: MOCK_ADDRESSES.charlie,
        walletType: WalletType.WATCH_ONLY,
        signed: false,
        isContact: true,
      },
      {
        name: 'Dave Contact',
        address: MOCK_ADDRESSES.dave,
        walletType: WalletType.POLKADOT_VAULT,
        signed: false,
        isContact: true,
      },
    ],
  },
];

const INITIAL_DRAFTS: Draft[] = [
  {
    id: 'draft-1',
    multisigId: '1',
    multisigName: 'Treasury Multisig',
    description: 'Monthly validator rewards payout',
    callData: '0xabcd1234...',
    txType: 'balances.transferKeepAlive',
    chainName: 'Polkadot',
    amount: '500 DOT',
    dest: '5FHneW46xGXgs5mUiveU4sbTyGBzmstUspZC92UhjJM694ty',
    createdAt: '10 min ago',
  },
  {
    id: 'draft-2',
    multisigId: '2',
    multisigName: 'Dev Operations',
    description: 'Add new team member as proxy',
    callData: '0xef567890...',
    txType: 'proxy.addProxy',
    chainName: 'Polkadot',
    amount: '',
    dest: '5GNJqTPyNqANBkUVMN1LPPrxXnFouWA2MRQg3gKrUYgw6J9i',
    createdAt: '2 hours ago',
  },
];

const MULTISIG_WALLETS = [
  {
    id: '1',
    name: 'Treasury Multisig',
    address: MOCK_ADDRESSES.dave,
    threshold: 3,
    signatories: 5,
    network: 'Polkadot',
  },
  {
    id: '2',
    name: 'Dev Operations',
    address: MOCK_ADDRESSES.charlie,
    threshold: 2,
    signatories: 3,
    network: 'Polkadot',
  },
  { id: '3', name: 'Kusama Council', address: MOCK_ADDRESSES.bob, threshold: 4, signatories: 7, network: 'Kusama' },
];

const PARSED_CALL_DATA = {
  section: 'balances',
  method: 'transferKeepAlive',
  dest: '5FHneW46xGXgs5mUiveU4sbTyGBzmstUspZC92UhjJM694ty',
  value: '250 DOT',
};

// ─── Operation icon ─────────────────────────────────────────────────────────

const truncateStr = (str: string, start = 7, end = 8) =>
  str.length > start + end + 3 ? `${str.slice(0, start)}...${str.slice(-end)}` : str;

const opIconBg: Record<string, string> = {
  pending: 'bg-icon-warning',
  executed: 'bg-icon-positive',
  cancelled: 'bg-icon-negative',
};

// ─── Status badge ───────────────────────────────────────────────────────────

const StatusBadge = ({ op }: { op: MockOperation }) => {
  if (op.status === 'pending') {
    return (
      <div className="flex w-fit items-center rounded-[20px] border border-shade-8 px-2.5 py-1">
        <CaptionText className="text-text-secondary uppercase">
          {op.signed} of {op.threshold} signed
        </CaptionText>
      </div>
    );
  }

  const colors: Record<string, string> = {
    executed: 'border-text-positive text-text-positive',
    cancelled: 'border-text-negative text-text-negative',
  };

  return (
    <div className={`flex w-fit items-center rounded-[20px] border px-2.5 py-1 ${colors[op.status]}`}>
      <CaptionText className="uppercase">{op.status === 'executed' ? 'Executed' : 'Cancelled'}</CaptionText>
    </div>
  );
};

// ─── Chain icon placeholder ─────────────────────────────────────────────────

const ChainIcon = ({ chain }: { chain: string }) => {
  const colors: Record<string, string> = {
    Polkadot: 'bg-[#E6007A]',
    'Polkadot Asset Hub': 'bg-[#E6007A]',
    Kusama: 'bg-[#000000]',
  };

  return <div className={`h-[32px] w-[32px] shrink-0 rounded-full ${colors[chain] ?? 'bg-icon-default'}`} />;
};

// ─── Operation row ──────────────────────────────────────────────────────────

const OperationRow = ({ op }: { op: MockOperation }) => (
  <div className="rounded bg-block-background-default transition-shadow hover:shadow-card-shadow">
    <Accordion>
      <Accordion.Trigger>
        <div className="flex h-[52px] w-full items-center px-4 py-2">
          <div className="flex w-[500px] min-w-0 shrink-0 items-center gap-x-2">
            <div className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-full ${opIconBg[op.status]}`}>
              <Icon name={op.iconName as 'transferMst'} size={20} className="text-white" />
            </div>
            <div className="flex min-w-0 flex-1 flex-col">
              <FootnoteText className="truncate font-medium text-text-primary">{op.txType}</FootnoteText>
              <HelpText className="truncate text-text-tertiary">{op.chainName}</HelpText>
            </div>
            <div className="flex w-[240px] shrink-0 items-center gap-x-2">
              {op.amount ? (
                <>
                  <ChainIcon chain={op.chainName} />
                  <div className="flex flex-col">
                    <FootnoteText className="text-text-primary">{op.amount}</FootnoteText>
                    <HelpText className="text-text-tertiary">{op.amountUsd}</HelpText>
                  </div>
                </>
              ) : (
                <FootnoteText className="text-text-tertiary">&mdash;</FootnoteText>
              )}
            </div>
          </div>
          <div className="flex min-w-0 flex-1 items-center">
            <div className="flex w-[240px] shrink-0 items-center gap-x-2">
              <div className="relative shrink-0">
                <Identicon address={op.account.address} size={32} theme="polkadot" />
                <div className="absolute -right-0.5 -bottom-0.5">
                  <WalletIcon type={op.account.walletType ?? WalletType.MULTISIG} size={14} />
                </div>
              </div>
              <div className="flex min-w-0 flex-col">
                <FootnoteText className="truncate text-text-primary">{op.account.name}</FootnoteText>
                <HelpText className="text-text-tertiary">{truncateStr(op.account.address, 6, 6)}</HelpText>
              </div>
            </div>
            <div className="mx-3 flex w-[120px] shrink-0 items-center justify-end">
              <StatusBadge op={op} />
            </div>
            <div
              className="flex w-[140px] shrink-0 items-center justify-end gap-x-2"
              onClick={(e) => e.stopPropagation()}
            >
              {op.canReject && (
                <Button variant="fill" pallet="error" size="sm">
                  Reject
                </Button>
              )}
              {op.canApprove && (
                <Button variant="fill" size="sm">
                  Approve
                </Button>
              )}
            </div>
            <div className="ml-2 flex shrink-0 items-center gap-x-1" onClick={(e) => e.stopPropagation()}>
              <IconButton name="export" className="text-icon-default" />
            </div>
          </div>
        </div>
      </Accordion.Trigger>
      <Accordion.Content>
        <div className="border-t border-divider">
          <div className="grid grid-cols-3">
            {/* ── Details column ── */}
            <div className="flex min-w-0 flex-col gap-y-4 border-r border-divider p-4">
              <SmallTitleText>Details</SmallTitleText>
              <div className="flex flex-col gap-y-2">
                <DetailRow label="Depositor" className="text-text-secondary">
                  <div className="flex items-center gap-2">
                    {op.depositor.name && (
                      <>
                        <WalletIcon type={WalletType.POLKADOT_VAULT} size={16} />
                        <FootnoteText className="text-text-secondary">{op.depositor.name}</FootnoteText>
                      </>
                    )}
                  </div>
                </DetailRow>
                {op.recipient && (
                  <DetailRow label="Recipient" className="text-text-secondary">
                    <div className="flex min-w-0 items-center gap-2">
                      <Identicon address={op.recipient.address} size={16} theme="polkadot" />
                      <FootnoteText className="truncate text-text-secondary">
                        {truncateStr(op.recipient.address, 6, 6)}
                      </FootnoteText>
                      <Copy value={op.recipient.address}>
                        <IconButton name="copy" className="shrink-0 text-icon-default" />
                      </Copy>
                    </div>
                  </DetailRow>
                )}
                <DetailRow label="Date & Time" className="text-text-secondary">
                  <FootnoteText className="text-text-secondary">{op.date}</FootnoteText>
                </DetailRow>
              </div>
            </div>

            {/* ── Signatories column ── */}
            <div className="flex min-w-0 flex-col border-r border-divider p-4">
              <div className="mb-4 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <SmallTitleText>Signatories</SmallTitleText>
                  <Button pallet="secondary" variant="fill" size="sm">
                    Log
                    <span className="ml-1.5 rounded-full bg-chip-icon px-1.5 pt-px pb-[2px] text-[10px] text-white">
                      {op.signatories.filter((s) => s.signed).length}
                    </span>
                  </Button>
                </div>
                <Button pallet="primary" variant="text" size="sm">
                  Open overview
                </Button>
              </div>

              <div className="flex flex-col gap-y-2">
                {/* Your wallets */}
                {op.signatories.some((s) => !s.isContact) && (
                  <div>
                    <FootnoteText className="mb-1 text-text-tertiary">Your wallets</FootnoteText>
                    <ul className="flex flex-col">
                      {op.signatories
                        .filter((s) => !s.isContact)
                        .map((s) => (
                          <li
                            key={s.address}
                            className="flex items-center justify-between rounded-sm px-2 py-1.5 hover:bg-action-background-hover"
                          >
                            <div className="flex min-w-0 items-center gap-2">
                              <WalletIcon type={s.walletType ?? WalletType.POLKADOT_VAULT} size={20} />
                              <BodyText className="mr-auto truncate text-text-secondary">{s.name}</BodyText>
                            </div>
                            <div
                              className={`flex w-fit items-center rounded-[20px] border px-2 py-0.5 ${
                                s.signed
                                  ? 'border-text-positive text-text-positive'
                                  : 'border-shade-8 text-text-tertiary'
                              }`}
                            >
                              <CaptionText className="uppercase">{s.signed ? 'Signed' : 'Unsigned'}</CaptionText>
                            </div>
                          </li>
                        ))}
                    </ul>
                  </div>
                )}

                {/* Contacts */}
                {op.signatories.some((s) => s.isContact) && (
                  <div>
                    <FootnoteText className="mb-1 text-text-tertiary">Contacts</FootnoteText>
                    <ul className="flex flex-col">
                      {op.signatories
                        .filter((s) => s.isContact)
                        .map((s) => (
                          <li
                            key={s.address}
                            className="flex items-center justify-between rounded-sm px-2 py-1.5 hover:bg-action-background-hover"
                          >
                            <div className="flex min-w-0 items-center gap-2">
                              <Identicon address={s.address} size={20} theme="polkadot" />
                              <div className="flex min-w-0 flex-col">
                                <FootnoteText className="truncate text-text-secondary">{s.name}</FootnoteText>
                                <HelpText className="truncate text-text-tertiary">
                                  {truncateStr(s.address, 6, 6)}
                                </HelpText>
                              </div>
                            </div>
                            <div
                              className={`flex shrink-0 items-center rounded-[20px] border px-2 py-0.5 ${
                                s.signed
                                  ? 'border-text-positive text-text-positive'
                                  : 'border-shade-8 text-text-tertiary'
                              }`}
                            >
                              <CaptionText className="uppercase">{s.signed ? 'Signed' : 'Unsigned'}</CaptionText>
                            </div>
                          </li>
                        ))}
                    </ul>
                  </div>
                )}
              </div>
            </div>

            {/* ── Advanced column ── */}
            <div className="flex min-w-0 flex-col gap-y-4 p-4">
              <div className="flex items-center justify-between">
                <SmallTitleText>Advanced</SmallTitleText>
                <Tooltip>
                  <Tooltip.Trigger>
                    <IconButton name="close" className="text-icon-default" />
                  </Tooltip.Trigger>
                  <Tooltip.Content>{op.status === 'cancelled' ? 'Unhide operation' : 'Hide operation'}</Tooltip.Content>
                </Tooltip>
              </div>

              <div className="flex flex-col gap-y-2">
                {op.callHash && (
                  <DetailRow label="Call Hash" className="text-text-secondary">
                    <Copy value={op.callHash}>
                      <button
                        type="button"
                        className="group -mr-2 flex cursor-pointer items-center gap-x-1 rounded-sm px-2 py-[3px] hover:bg-action-background-hover"
                      >
                        <FootnoteText className="truncate text-text-secondary">{truncateStr(op.callHash)}</FootnoteText>
                        <Icon
                          name="copy"
                          size={16}
                          className="shrink-0 text-icon-default group-hover:text-icon-hover"
                        />
                      </button>
                    </Copy>
                  </DetailRow>
                )}

                {op.callData && (
                  <DetailRow label="Call Data" className="text-text-secondary">
                    <Copy value={op.callData}>
                      <button
                        type="button"
                        className="group -mr-2 flex cursor-pointer items-center gap-x-1 rounded-sm px-2 py-[3px] hover:bg-action-background-hover"
                      >
                        <FootnoteText className="truncate text-text-secondary">{truncateStr(op.callData)}</FootnoteText>
                        <Icon
                          name="copy"
                          size={16}
                          className="shrink-0 text-icon-default group-hover:text-icon-hover"
                        />
                      </button>
                    </Copy>
                  </DetailRow>
                )}

                {op.deposit && (
                  <DetailRow label="Multisig deposit" className="text-text-secondary">
                    <FootnoteText className="py-[3px] text-text-secondary">{op.deposit}</FootnoteText>
                  </DetailRow>
                )}

                {op.blockCreated && op.indexCreated && (
                  <DetailRow label="Time Point" className="text-text-secondary">
                    <FootnoteText className="py-[3px] text-text-secondary">
                      {op.blockCreated}-{op.indexCreated}
                    </FootnoteText>
                  </DetailRow>
                )}
              </div>
            </div>
          </div>
        </div>
      </Accordion.Content>
    </Accordion>
  </div>
);

// ─── Draft row ──────────────────────────────────────────────────────────────

const DraftRow = ({
  draft,
  onEdit,
  onDelete,
  onSubmit,
}: {
  draft: Draft;
  onEdit: () => void;
  onDelete: () => void;
  onSubmit: () => void;
}) => (
  <div className="rounded bg-block-background-default transition-shadow hover:shadow-card-shadow">
    <div className="flex h-[52px] w-full items-center px-4 py-2">
      {/* Icon + description */}
      <div className="flex min-w-0 flex-1 items-center gap-x-3">
        <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-icon-accent/15">
          <Icon name="document" size={16} className="text-icon-accent" />
        </div>
        <div className="flex min-w-0 flex-1 flex-col">
          <FootnoteText className="truncate font-medium text-text-primary">{draft.description}</FootnoteText>
          <HelpText className="truncate text-text-tertiary">
            {draft.multisigName} &middot; {draft.txType}
            {draft.amount ? ` &middot; ${draft.amount}` : ''}
          </HelpText>
        </div>
      </div>

      {/* Chain + time */}
      <div className="flex w-[120px] shrink-0 flex-col items-end">
        <FootnoteText className="text-text-primary">{draft.chainName}</FootnoteText>
        <HelpText className="text-text-tertiary">{draft.createdAt}</HelpText>
      </div>

      {/* Draft badge */}
      <div className="mx-3 flex w-[80px] shrink-0 items-center justify-end">
        <div className="flex w-fit items-center rounded-[20px] border border-icon-accent/30 bg-icon-accent/8 px-2.5 py-1">
          <CaptionText className="text-icon-accent uppercase">Draft</CaptionText>
        </div>
      </div>

      {/* Actions */}
      <div className="flex shrink-0 items-center gap-x-1" onClick={(e) => e.stopPropagation()}>
        <Button variant="text" size="sm" onClick={onEdit}>
          Edit
        </Button>
        <Button variant="fill" size="sm" onClick={onSubmit}>
          Submit
        </Button>
        <IconButton name="delete" className="text-icon-default hover:text-text-negative" onClick={onDelete} />
      </div>
    </div>
  </div>
);

// ─── Drafts section (collapsible) ───────────────────────────────────────────

const DraftsSection = ({
  drafts,
  onCreateDraft,
  onEditDraft,
  onDeleteDraft,
  onSubmitDraft,
}: {
  drafts: Draft[];
  onCreateDraft: () => void;
  onEditDraft: (draft: Draft) => void;
  onDeleteDraft: (id: string) => void;
  onSubmitDraft: (id: string) => void;
}) => (
  <div className="mb-6">
    <Accordion initialOpen>
      <Accordion.Trigger sticky>
        <div className="flex items-center gap-2 py-2">
          <FootnoteText className="font-medium text-text-secondary">Drafts</FootnoteText>
          <div className="flex h-5 min-w-[20px] items-center justify-center rounded-full bg-icon-accent/15 px-2">
            <CaptionText className="font-medium text-icon-accent">{drafts.length}</CaptionText>
          </div>
        </div>
      </Accordion.Trigger>
      <Accordion.Content>
        <div className="mt-1 flex flex-col gap-y-1.5">
          {drafts.map((draft) => (
            <DraftRow
              key={draft.id}
              draft={draft}
              onEdit={() => onEditDraft(draft)}
              onDelete={() => onDeleteDraft(draft.id)}
              onSubmit={() => onSubmitDraft(draft.id)}
            />
          ))}

          {/* Create new draft button */}
          <button
            type="button"
            className="group w-full cursor-pointer rounded-lg border-2 border-dashed border-shade-12 px-4 py-3.5 transition-all hover:border-icon-accent hover:bg-icon-accent/4 active:scale-[0.998]"
            onClick={onCreateDraft}
          >
            <div className="flex items-center gap-3">
              <div className="flex h-7 w-7 items-center justify-center rounded-full border-2 border-dashed border-shade-12 transition-colors group-hover:border-icon-accent group-hover:bg-icon-accent/10">
                <Icon
                  name="add"
                  size={14}
                  className="text-text-tertiary transition-colors group-hover:text-icon-accent"
                />
              </div>
              <FootnoteText className="font-medium text-text-tertiary transition-colors group-hover:text-icon-accent">
                Create new draft
              </FootnoteText>
            </div>
          </button>
        </div>
      </Accordion.Content>
    </Accordion>
  </div>
);

// ─── Filter bar ─────────────────────────────────────────────────────────────

const FilterBar = () => (
  <div className="flex h-9 items-center gap-2">
    <div className="w-[136px]">
      <Select placeholder="Date range" value="" onChange={() => {}}>
        <Select.Item value="7d">Last 7 days</Select.Item>
        <Select.Item value="30d">Last 30 days</Select.Item>
        <Select.Item value="90d">Last 90 days</Select.Item>
      </Select>
    </div>
    <div className="w-[136px]">
      <Select placeholder="Accounts" value="" onChange={() => {}}>
        <Select.Item value="all">All accounts</Select.Item>
      </Select>
    </div>
    <div className="w-[136px]">
      <Select placeholder="Proxy type" value="" onChange={() => {}}>
        <Select.Item value="any">Any</Select.Item>
      </Select>
    </div>
    <div className="w-[136px]">
      <Select placeholder="Networks" value="" onChange={() => {}}>
        <Select.Item value="polkadot">Polkadot</Select.Item>
        <Select.Item value="kusama">Kusama</Select.Item>
      </Select>
    </div>
    <div className="w-[136px]">
      <Select placeholder="Operation type" value="" onChange={() => {}}>
        <Select.Item value="transfer">Transfer</Select.Item>
        <Select.Item value="bond">Bond</Select.Item>
        <Select.Item value="addProxy">Add proxy</Select.Item>
      </Select>
    </div>
    <IconButton name="export" className="text-icon-default" />
  </div>
);

// ─── Step components for Create/Edit Draft modal ────────────────────────────

const StepIndicator = ({ current, total }: { current: number; total: number }) => (
  <div className="flex items-center justify-center gap-2">
    {Array.from({ length: total }, (_, i) => (
      <div key={i} className="flex items-center gap-2">
        <div
          className={`flex h-8 w-8 items-center justify-center rounded-full text-sm font-medium transition-colors ${
            i + 1 === current
              ? 'bg-icon-accent text-white'
              : i + 1 < current
                ? 'bg-icon-positive text-white'
                : 'bg-input-background-disabled text-text-tertiary'
          }`}
        >
          {i + 1 < current ? '\u2713' : i + 1}
        </div>
        {i < total - 1 && <div className={`h-0.5 w-8 ${i + 1 < current ? 'bg-icon-positive' : 'bg-divider'}`} />}
      </div>
    ))}
  </div>
);

const StepSelectMultisig = ({
  selected,
  onSelect,
  onNext,
}: {
  selected: string;
  onSelect: (v: string) => void;
  onNext: () => void;
}) => (
  <Box direction="column" gap={4}>
    <FootnoteText className="text-text-tertiary">Select a multisig wallet for this operation</FootnoteText>
    <Select placeholder="Choose multisig wallet" value={selected} onChange={onSelect}>
      {MULTISIG_WALLETS.map((w) => (
        <Select.Item key={w.id} value={w.id}>
          {w.name} ({w.threshold}/{w.signatories})
        </Select.Item>
      ))}
    </Select>

    {selected &&
      (() => {
        const wallet = MULTISIG_WALLETS.find((w) => w.id === selected);

        if (!wallet) return null;

        return (
          <Surface elevation={1} className="p-4">
            <div className="flex items-center gap-3">
              <Identicon address={wallet.address} size={40} theme="polkadot" />
              <div className="flex flex-col gap-0.5">
                <FootnoteText className="font-medium text-text-primary">{wallet.name}</FootnoteText>
                <HelpText className="text-text-tertiary">
                  {wallet.network} &middot; {wallet.threshold} of {wallet.signatories}
                </HelpText>
                <HelpText className="text-text-tertiary">
                  <Hash value={wallet.address} variant="truncate" />
                </HelpText>
              </div>
            </div>
          </Surface>
        );
      })()}

    <div className="flex justify-end pt-2">
      <Button disabled={!selected} onClick={onNext}>
        Continue
      </Button>
    </div>
  </Box>
);

const StepCallData = ({
  callData,
  onChangeCallData,
  isParsed,
  onParse,
  onBack,
  onNext,
}: {
  callData: string;
  onChangeCallData: (v: string) => void;
  isParsed: boolean;
  onParse: () => void;
  onBack: () => void;
  onNext: () => void;
}) => (
  <Box direction="column" gap={4}>
    <FootnoteText className="text-text-tertiary">Paste the encoded call data for the multisig operation</FootnoteText>
    <Input placeholder="0x..." value={callData} width="full" height="md" onChange={onChangeCallData} />
    {callData && !isParsed && (
      <Button variant="text" size="sm" onClick={onParse}>
        Decode call data
      </Button>
    )}

    {isParsed && (
      <Surface elevation={1} className="p-4">
        <div className="flex flex-col gap-3">
          <div className="flex items-center gap-2">
            <Icon name="checkmark" size={16} className="text-icon-positive" />
            <FootnoteText className="font-medium text-text-positive">Call data decoded successfully</FootnoteText>
          </div>
          <Separator />
          <div className="flex flex-col gap-1.5">
            <div className="flex justify-between">
              <HelpText className="text-text-tertiary">Pallet</HelpText>
              <FootnoteText className="text-text-primary">{PARSED_CALL_DATA.section}</FootnoteText>
            </div>
            <div className="flex justify-between">
              <HelpText className="text-text-tertiary">Method</HelpText>
              <FootnoteText className="text-text-primary">{PARSED_CALL_DATA.method}</FootnoteText>
            </div>
            <div className="flex justify-between">
              <HelpText className="text-text-tertiary">Destination</HelpText>
              <Hash value={PARSED_CALL_DATA.dest} variant="truncate" />
            </div>
            <div className="flex justify-between">
              <HelpText className="text-text-tertiary">Value</HelpText>
              <FootnoteText className="text-text-primary">{PARSED_CALL_DATA.value}</FootnoteText>
            </div>
          </div>
        </div>
      </Surface>
    )}

    <div className="flex justify-between pt-2">
      <Button variant="text" onClick={onBack}>
        Back
      </Button>
      <Button disabled={!isParsed} onClick={onNext}>
        Continue
      </Button>
    </div>
  </Box>
);

const StepDescription = ({
  description,
  onChangeDescription,
  selectedMultisig,
  onBack,
  onSave,
  saveLabel,
}: {
  description: string;
  onChangeDescription: (v: string) => void;
  selectedMultisig: string;
  onBack: () => void;
  onSave: () => void;
  saveLabel: string;
}) => {
  const wallet = MULTISIG_WALLETS.find((w) => w.id === selectedMultisig);

  return (
    <Box direction="column" gap={4}>
      <FootnoteText className="text-text-tertiary">
        Add a description so signatories understand the purpose of this operation
      </FootnoteText>
      <Input
        placeholder="e.g. Transfer funds to validator rewards pool"
        value={description}
        width="full"
        height="md"
        onChange={onChangeDescription}
      />

      <Surface elevation={1} className="p-4">
        <div className="flex flex-col gap-3">
          <CaptionText className="text-text-tertiary uppercase">Summary</CaptionText>
          <Separator />
          <div className="flex flex-col gap-1.5">
            <div className="flex justify-between">
              <HelpText className="text-text-tertiary">Multisig</HelpText>
              <FootnoteText className="text-text-primary">{wallet?.name}</FootnoteText>
            </div>
            <div className="flex justify-between">
              <HelpText className="text-text-tertiary">Threshold</HelpText>
              <FootnoteText className="text-text-primary">
                {wallet?.threshold} of {wallet?.signatories}
              </FootnoteText>
            </div>
            <div className="flex justify-between">
              <HelpText className="text-text-tertiary">Operation</HelpText>
              <FootnoteText className="text-text-primary">
                {PARSED_CALL_DATA.section}.{PARSED_CALL_DATA.method}
              </FootnoteText>
            </div>
            <div className="flex justify-between">
              <HelpText className="text-text-tertiary">Amount</HelpText>
              <FootnoteText className="text-text-primary">{PARSED_CALL_DATA.value}</FootnoteText>
            </div>
            {description && (
              <div className="flex justify-between">
                <HelpText className="text-text-tertiary">Description</HelpText>
                <FootnoteText className="text-text-primary">{description}</FootnoteText>
              </div>
            )}
          </div>
        </div>
      </Surface>

      <div className="flex justify-between pt-2">
        <Button variant="text" onClick={onBack}>
          Back
        </Button>
        <Button disabled={!description.trim()} onClick={onSave}>
          {saveLabel}
        </Button>
      </div>
    </Box>
  );
};

// ─── Main prototype ─────────────────────────────────────────────────────────

const MultisigOperationsPrototype = () => {
  const [tab, setTab] = useState('pending');
  const [search, setSearch] = useState('');
  const [drafts, setDrafts] = useState<Draft[]>(INITIAL_DRAFTS);

  // Modal state
  const [isModalOpen, setModalOpen] = useState(false);
  const [modalMode, setModalMode] = useState<'create' | 'edit'>('create');
  const [editingDraftId, setEditingDraftId] = useState<string | null>(null);
  const [step, setStep] = useState(1);
  const [selectedMultisig, setSelectedMultisig] = useState('');
  const [callData, setCallData] = useState('');
  const [isParsed, setIsParsed] = useState(false);
  const [description, setDescription] = useState('');
  const [saved, setSaved] = useState(false);

  const resetFlow = () => {
    setStep(1);
    setSelectedMultisig('');
    setCallData('');
    setIsParsed(false);
    setDescription('');
    setSaved(false);
    setEditingDraftId(null);
  };

  const openCreateModal = () => {
    resetFlow();
    setModalMode('create');
    setModalOpen(true);
  };

  const openEditModal = (draft: Draft) => {
    resetFlow();
    setModalMode('edit');
    setEditingDraftId(draft.id);
    setSelectedMultisig(draft.multisigId);
    setCallData(draft.callData);
    setIsParsed(true);
    setDescription(draft.description);
    setStep(3);
    setModalOpen(true);
  };

  const handleSave = () => {
    if (modalMode === 'edit' && editingDraftId) {
      setDrafts((prev) =>
        prev.map((d) =>
          d.id === editingDraftId
            ? {
                ...d,
                description,
                multisigId: selectedMultisig,
                multisigName: MULTISIG_WALLETS.find((w) => w.id === selectedMultisig)?.name ?? d.multisigName,
              }
            : d,
        ),
      );
    } else {
      const newDraft: Draft = {
        id: `draft-${Date.now()}`,
        multisigId: selectedMultisig,
        multisigName: MULTISIG_WALLETS.find((w) => w.id === selectedMultisig)?.name ?? '',
        description,
        callData,
        txType: `${PARSED_CALL_DATA.section}.${PARSED_CALL_DATA.method}`,
        chainName: 'Polkadot',
        amount: PARSED_CALL_DATA.value,
        dest: PARSED_CALL_DATA.dest,
        createdAt: 'Just now',
      };

      setDrafts((prev) => [newDraft, ...prev]);
    }

    setSaved(true);
    setTimeout(() => setModalOpen(false), 1200);
  };

  const handleDeleteDraft = (id: string) => {
    setDrafts((prev) => prev.filter((d) => d.id !== id));
  };

  const pendingOps = OPERATIONS.filter((op) => op.status === 'pending');
  const historyOps = OPERATIONS.filter((op) => op.status !== 'pending');
  const displayOps = tab === 'pending' ? pendingOps : historyOps;

  const filteredOps = displayOps.filter((op) => {
    if (!search) return true;

    return (
      op.txType.toLowerCase().includes(search.toLowerCase()) ||
      op.account.name.toLowerCase().includes(search.toLowerCase()) ||
      op.callHash.toLowerCase().includes(search.toLowerCase())
    );
  });

  const groupedOps = filteredOps.reduce<Record<string, MockOperation[]>>((acc, op) => {
    const group = acc[op.dateGroup] ?? [];
    group.push(op);
    acc[op.dateGroup] = group;

    return acc;
  }, {});

  const modalTitle = saved
    ? modalMode === 'edit'
      ? 'Draft updated'
      : 'Draft created'
    : modalMode === 'edit'
      ? 'Edit draft'
      : ['Select multisig', 'Call data', 'Create draft'][step - 1];

  return (
    <div className="flex min-h-[600px] w-full flex-col bg-main-app-background">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-container-border bg-top-nav-bar-background px-6 pt-4 pb-[15px]">
        <TitleText className="py-[3px] text-text-primary">Multisig Operations</TitleText>
        <div className="w-[230px]">
          <SearchInput value={search} placeholder="Search" onChange={setSearch} />
        </div>
      </div>

      {/* Content */}
      <div className="mx-auto flex h-full w-full max-w-[1084px] flex-col">
        {/* Tabs + Filters */}
        <div className="flex items-center justify-between py-4">
          <Tabs value={tab} onChange={setTab}>
            <Tabs.List>
              <Tabs.Trigger value="pending">
                Pending <span className="ml-1 text-text-tertiary">{pendingOps.length}</span>
              </Tabs.Trigger>
              <Tabs.Trigger value="history">History</Tabs.Trigger>
            </Tabs.List>
          </Tabs>
          <FilterBar />
        </div>

        {/* Operations list */}
        <div className="flex-1 overflow-y-auto pb-10">
          {/* Drafts section — only in pending tab */}
          {tab === 'pending' && (
            <DraftsSection
              drafts={drafts}
              onCreateDraft={openCreateModal}
              onEditDraft={openEditModal}
              onDeleteDraft={handleDeleteDraft}
              onSubmitDraft={handleDeleteDraft}
            />
          )}

          {filteredOps.length === 0 && tab !== 'pending' ? (
            <div className="flex flex-col items-center justify-center gap-3 py-20">
              <Icon name="document" size={48} className="text-icon-default" />
              <FootnoteText className="text-text-tertiary">No operations in history</FootnoteText>
            </div>
          ) : (
            <div className="flex flex-col">
              {Object.entries(groupedOps).map(([date, ops]) => (
                <section key={date} className="mb-8 w-full">
                  <FootnoteText className="mb-3 ml-2 text-text-tertiary">{date}</FootnoteText>
                  <ul className="flex flex-col gap-y-1.5">
                    {ops.map((op) => (
                      <li key={op.id}>
                        <OperationRow op={op} />
                      </li>
                    ))}
                  </ul>
                </section>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Create / Edit draft modal */}
      <Modal isOpen={isModalOpen} size="md" onToggle={setModalOpen}>
        <Modal.Title close>{modalTitle}</Modal.Title>
        <Modal.Content>
          <div className="px-5 py-4">
            {saved ? (
              <div className="flex flex-col items-center justify-center gap-4 py-8">
                <div className="flex h-16 w-16 items-center justify-center rounded-full bg-icon-positive/10">
                  <Icon name="checkmark" size={32} className="text-icon-positive" />
                </div>
                <BodyText className="font-medium text-text-primary">
                  {modalMode === 'edit' ? 'Draft updated successfully' : 'Draft created successfully'}
                </BodyText>
                <HelpText className="text-center text-text-tertiary">
                  {modalMode === 'edit'
                    ? 'Your changes have been saved.'
                    : 'You can submit it when ready or continue editing later.'}
                </HelpText>
              </div>
            ) : (
              <div className="flex flex-col gap-6">
                {modalMode === 'create' && <StepIndicator current={step} total={3} />}

                {step === 1 && modalMode === 'create' && (
                  <StepSelectMultisig
                    selected={selectedMultisig}
                    onSelect={setSelectedMultisig}
                    onNext={() => setStep(2)}
                  />
                )}

                {step === 2 && modalMode === 'create' && (
                  <StepCallData
                    callData={callData}
                    isParsed={isParsed}
                    onChangeCallData={(v) => {
                      setCallData(v);
                      setIsParsed(false);
                    }}
                    onParse={() => setIsParsed(true)}
                    onBack={() => setStep(1)}
                    onNext={() => setStep(3)}
                  />
                )}

                {step === 3 && (
                  <StepDescription
                    description={description}
                    selectedMultisig={selectedMultisig}
                    saveLabel={modalMode === 'edit' ? 'Save changes' : 'Create draft'}
                    onChangeDescription={setDescription}
                    onBack={modalMode === 'edit' ? () => setModalOpen(false) : () => setStep(2)}
                    onSave={handleSave}
                  />
                )}
              </div>
            )}
          </div>
        </Modal.Content>
      </Modal>
    </div>
  );
};

const meta: Meta<typeof MultisigOperationsPrototype> = {
  component: MultisigOperationsPrototype,
  title: 'Prototypes/MultisigOperations',
  parameters: {
    layout: 'fullscreen',
  },
};

export default meta;

type Story = StoryObj<typeof MultisigOperationsPrototype>;

export const Default: Story = {};
