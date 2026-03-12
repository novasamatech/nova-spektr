import { type Meta, type StoryObj } from '@storybook/react-vite';
import { useMemo, useState } from 'react';

import { type Address, type Chain, WalletType } from '@/shared/core';
import {
  BodyText,
  Button,
  CaptionText,
  Counter,
  FootnoteText,
  HelpText,
  Icon,
  IconButton,
  SmallTitleText,
  Switch,
  TitleText,
} from '@/shared/ui';
import { ChainIcon, Hash, Identicon, WalletIcon } from '@/shared/ui-entities';
import { Accordion, Modal, SearchInput, Select, Tabs } from '@/shared/ui-kit';

// ─── Mock data ───────────────────────────────────────────────────────────────

const MOCK_ADDRESSES = {
  alice: '5GrwvaEF5zXb26Fz9rcQpDWS57CtERHpNehXCPcNoHGKutQY' as Address,
  bob: '5FHneW46xGXgs5mUiveU4sbTyGBzmstUspZC92UhjJM694ty' as Address,
  charlie: '5GNJqTPyNqANBkUVMN1LPPrxXnFouWA2MRQg3gKrUYgw6J9i' as Address,
  dave: '5DfhGyQdFobKM8NsWvEeAKk5EhQhro4TPAqv3HRfCCUjQcSo' as Address,
  eve: '5HGjWAeFDfFCWPsjFQdVV2Msvz2XtMktvgocEZcCj68kUMaw' as Address,
};

type MockWallet = {
  id: string;
  name: string;
  type: WalletType;
  address: Address;
};

const WALLETS: MockWallet[] = [
  { id: 'w1', name: 'Treasury Multisig', type: WalletType.MULTISIG, address: MOCK_ADDRESSES.alice },
  { id: 'w2', name: 'Dev Operations', type: WalletType.MULTISIG, address: MOCK_ADDRESSES.bob },
  { id: 'w3', name: 'Main Vault', type: WalletType.POLKADOT_VAULT, address: MOCK_ADDRESSES.charlie },
  { id: 'w4', name: 'Watch Only', type: WalletType.WATCH_ONLY, address: MOCK_ADDRESSES.dave },
];

// ─── Mock chains (icon URLs from nova-spektr-utils repo) ─────────────────────

const CHAIN_ICON_BASE = 'https://raw.githubusercontent.com/novasamatech/nova-spektr-utils/main/icons/v1/chains';

const mockChain = (name: string, iconName: string, chainId: string): Chain =>
  ({
    chainId,
    name,
    specName: name.toLowerCase().replace(/ /g, '-'),
    icon: `${CHAIN_ICON_BASE}/${iconName}.svg`,
    addressPrefix: 0,
    nodes: [],
    assets: [],
  }) as unknown as Chain;

const MOCK_CHAINS = {
  Polkadot: mockChain('Polkadot', 'Polkadot', '0x91b171bb158e2d3848fa23a9f1c25182fb8e20313b2c1eb49219da7a70ce90c3'),
  Kusama: mockChain('Kusama', 'Kusama', '0xb0a8d493285c2df73290dfb7e61f870f17b41801197a149ca93654499ea3dafe'),
  'Polkadot Asset Hub': mockChain(
    'Polkadot Asset Hub',
    'Polkadot_Asset_Hub',
    '0x68d56f15f85d3136970ec16946040bc1752654e906147f7e43e9d539d7c3de2f',
  ),
} satisfies Record<'Polkadot' | 'Kusama' | 'Polkadot Asset Hub', Chain>;

const getChain = (name: string): Chain => {
  const key: keyof typeof MOCK_CHAINS = name.startsWith('Polkadot Asset')
    ? 'Polkadot Asset Hub'
    : name.startsWith('Kusama')
      ? 'Kusama'
      : 'Polkadot';

  return MOCK_CHAINS[key];
};

// ─── Notification types ──────────────────────────────────────────────────────

type NotificationType =
  | 'multisig_created'
  | 'multisig_operation'
  | 'multisig_event'
  | 'proxy_created'
  | 'proxy_removed';

type NotificationStatus = 'info' | 'success' | 'error';
type EventStatus = 'approve' | 'reject';

type MockNotification = {
  id: string;
  type: NotificationType;
  status: NotificationStatus;
  read: boolean;
  walletId: string;
  chainName: string;
  issuer: Address;
  dateGroup: string;
  time: string;
  // MultisigOperation fields
  opTitle?: string;
  opAmount?: string;
  // MultisigEvent fields
  eventStatus?: EventStatus;
  signerName?: string;
  signerAddress?: Address;
  signerWalletType?: WalletType;
  // MultisigCreated fields
  multisigAccountName?: string;
  threshold?: number;
  signatories?: number;
  // Proxy fields
  proxiedWalletName?: string;
  proxiedAddress?: Address;
  proxyWalletName?: string;
  proxyWalletType?: WalletType;
  proxyType?: string;
};

const NOTIFICATIONS: MockNotification[] = [
  // ── MultisigOperation: info (Created) ──
  {
    id: 'n1',
    type: 'multisig_operation',
    status: 'info',
    read: false,
    walletId: 'w1',
    chainName: 'Polkadot',
    issuer: MOCK_ADDRESSES.bob,
    dateGroup: '12 Mar 2026',
    time: '14:30',
    opTitle: 'Transfer',
    opAmount: '500 DOT',
  },
  // ── MultisigEvent: approve (Signed) ──
  {
    id: 'n2',
    type: 'multisig_event',
    status: 'success',
    read: false,
    walletId: 'w1',
    chainName: 'Polkadot Asset Hub',
    issuer: MOCK_ADDRESSES.bob,
    dateGroup: '12 Mar 2026',
    time: '13:55',
    opTitle: 'Transfer',
    opAmount: '0.01 DOT',
    eventStatus: 'approve',
    signerName: 'Bob',
    signerAddress: MOCK_ADDRESSES.bob,
    signerWalletType: WalletType.POLKADOT_VAULT,
  },
  // ── MultisigOperation: error (Rejected) ──
  {
    id: 'n3',
    type: 'multisig_operation',
    status: 'error',
    read: false,
    walletId: 'w2',
    chainName: 'Polkadot',
    issuer: MOCK_ADDRESSES.charlie,
    dateGroup: '12 Mar 2026',
    time: '12:30',
    opTitle: 'Add delegated authority (proxy)',
    opAmount: undefined,
  },
  // ── MultisigCreated ──
  {
    id: 'n4',
    type: 'multisig_created',
    status: 'info',
    read: true,
    walletId: 'w2',
    chainName: 'Polkadot',
    issuer: MOCK_ADDRESSES.alice,
    dateGroup: '11 Mar 2026',
    time: '09:15',
    multisigAccountName: 'Dev Operations',
    threshold: 2,
    signatories: 3,
  },
  // ── ProxyCreated ──
  {
    id: 'n5',
    type: 'proxy_created',
    status: 'info',
    read: true,
    walletId: 'w3',
    chainName: 'Kusama',
    issuer: MOCK_ADDRESSES.alice,
    dateGroup: '11 Mar 2026',
    time: '08:40',
    proxiedWalletName: 'Main Vault',
    proxiedAddress: MOCK_ADDRESSES.charlie,
    proxyWalletName: 'Treasury Multisig',
    proxyWalletType: WalletType.MULTISIG,
    proxyType: 'Any',
  },
  // ── MultisigOperation: success (Executed) ──
  {
    id: 'n6',
    type: 'multisig_operation',
    status: 'success',
    read: true,
    walletId: 'w2',
    chainName: 'Kusama',
    issuer: MOCK_ADDRESSES.dave,
    dateGroup: '10 Mar 2026',
    time: '16:00',
    opTitle: 'Transfer',
    opAmount: '5.5 KSM',
  },
  // ── MultisigEvent: reject ──
  {
    id: 'n7',
    type: 'multisig_event',
    status: 'error',
    read: true,
    walletId: 'w1',
    chainName: 'Polkadot',
    issuer: MOCK_ADDRESSES.eve,
    dateGroup: '10 Mar 2026',
    time: '11:20',
    opTitle: 'Add proxy',
    eventStatus: 'reject',
    signerName: 'Eve',
    signerAddress: MOCK_ADDRESSES.eve,
  },
  // ── ProxyRemoved ──
  {
    id: 'n8',
    type: 'proxy_removed',
    status: 'info',
    read: true,
    walletId: 'w4',
    chainName: 'Polkadot',
    issuer: MOCK_ADDRESSES.charlie,
    dateGroup: '9 Mar 2026',
    time: '14:00',
    proxiedWalletName: 'Watch Only',
    proxiedAddress: MOCK_ADDRESSES.dave,
    proxyWalletName: 'Main Vault',
    proxyWalletType: WalletType.POLKADOT_VAULT,
    proxyType: 'Staking',
  },
  // ── MultisigOperation: info (Created, another) ──
  {
    id: 'n9',
    type: 'multisig_operation',
    status: 'info',
    read: true,
    walletId: 'w1',
    chainName: 'Polkadot',
    issuer: MOCK_ADDRESSES.alice,
    dateGroup: '9 Mar 2026',
    time: '10:45',
    opTitle: 'Transfer',
    opAmount: '100 DOT',
  },
];

// ─── Helpers ─────────────────────────────────────────────────────────────────

const statusIconConfig: Record<NotificationStatus, { icon: string; color: string }> = {
  info: { icon: 'sendArrow', color: 'text-icon-accent' },
  success: { icon: 'checkmarkOutline', color: 'text-icon-positive' },
  error: { icon: 'closeOutline', color: 'text-icon-negative' },
};

const opStatusLabel: Record<NotificationStatus, string> = {
  info: 'Created',
  success: 'Executed',
  error: 'Rejected',
};

// ─── Inline chain title (ChainIcon + name, matches <ChainTitle>) ─────────────

const InlineChainTitle = ({ chainName, fontClass }: { chainName: string; fontClass?: string }) => (
  <span className="mx-1 inline-flex items-center gap-x-1">
    <ChainIcon chain={getChain(chainName)} size={16} />
    <span className={fontClass ?? 'text-text-secondary'}>{getChain(chainName).name}</span>
  </span>
);

// ─── Wallet icon with badge ──────────────────────────────────────────────────

const WalletIconWithBadge = ({ type, badgeColor }: { type: WalletType; badgeColor: string }) => (
  <div className="relative shrink-0">
    <WalletIcon type={type} size={20} />
    <div className={`absolute top-[13px] -right-px h-2 w-2 rounded-full border border-white ${badgeColor}`} />
  </div>
);

// ─── MultisigOperation: "Transfer 500 DOT Created" ──────────────────────────
// Detail: in <walletIcon><walletName> on <chain>

const MultisigOperationContent = ({ n }: { n: MockNotification }) => {
  const icon = statusIconConfig[n.status];
  const wallet = WALLETS.find((w) => w.id === n.walletId);

  return (
    <div className="flex gap-x-2">
      <div className="pt-[3px]">
        <Icon name={icon.icon as 'sendArrow'} size={14} className={icon.color} />
      </div>
      <div className="flex flex-col gap-y-4">
        <div className="flex flex-col gap-y-2">
          {/* Title row: "Transfer 500 DOT  Created" */}
          <BodyText>
            <div className="flex items-center justify-start gap-2">
              {n.opTitle && <span>{n.opTitle}</span>}
              {n.opAmount && <span className="font-semibold">{n.opAmount}</span>}
              <span>{opStatusLabel[n.status]}</span>
              {!n.read && <span className="inline-block h-2 w-2 shrink-0 rounded-full bg-icon-accent" />}
            </div>
          </BodyText>
          {/* Detail: in <wallet> on <chain> */}
          <BodyText className="inline-flex flex-wrap items-center gap-y-2 text-text-secondary">
            <span>in</span>
            {wallet && (
              <span className="mx-2 inline-flex items-center">
                <span className="mr-1">
                  <WalletIcon type={wallet.type} size={16} />
                </span>
                <span className="text-button-large text-text-primary">{wallet.name}</span>
              </span>
            )}
            <span>on</span>
            <InlineChainTitle chainName={n.chainName} />
          </BodyText>
        </div>
        <div className="self-start">
          <Button size="sm" variant="fill" pallet="secondary">
            View Operation
          </Button>
        </div>
      </div>
    </div>
  );
};

// ─── MultisigEvent: "Transfer 0.01 DOT  Signed" ─────────────────────────────
// Detail: by <signerWalletIcon|identicon><signerName> on <chain>

const MultisigEventContent = ({ n }: { n: MockNotification }) => {
  const icon = n.eventStatus === 'approve' ? statusIconConfig.success : statusIconConfig.error;
  const eventLabel = n.eventStatus === 'approve' ? 'Signed' : 'Rejected';

  return (
    <div className="flex gap-x-2">
      <div className="pt-[3px]">
        <Icon name={icon.icon as 'checkmarkOutline'} size={14} className={icon.color} />
      </div>
      <div className="flex flex-col gap-y-4">
        <div className="flex flex-col gap-y-2">
          {/* Title row: "Transfer 0.01 DOT  Signed" */}
          <BodyText>
            <div className="flex items-center justify-start gap-2">
              {n.opTitle && <span>{n.opTitle}</span>}
              {n.opAmount && <span className="font-semibold">{n.opAmount}</span>}
              <span>{eventLabel}</span>
              {!n.read && <span className="inline-block h-2 w-2 shrink-0 rounded-full bg-icon-accent" />}
            </div>
          </BodyText>
          {/* Detail: by <signer> on <chain> */}
          <BodyText className="inline-flex flex-wrap items-center gap-y-2 text-text-secondary">
            <span>by</span>
            <span className="mx-2 inline-flex items-center">
              <span className="mr-1">
                {n.signerWalletType ? (
                  <WalletIcon size={16} type={n.signerWalletType} />
                ) : (
                  <Identicon address={n.signerAddress ?? n.issuer} size={16} background={false} />
                )}
              </span>
              <span className="text-button-large text-text-primary">{n.signerName ?? 'Unknown'}</span>
            </span>
            <span>on</span>
            <InlineChainTitle chainName={n.chainName} />
          </BodyText>
        </div>
        <div className="self-start">
          <Button size="sm" variant="fill" pallet="secondary">
            View Operation
          </Button>
        </div>
      </div>
    </div>
  );
};

// ─── MultisigCreated: "New multisig wallet added" ────────────────────────────
// Detail: <name> with threshold X out of Y

const MultisigCreatedContent = ({ n }: { n: MockNotification }) => (
  <div className="flex gap-x-2">
    <WalletIconWithBadge type={WalletType.MULTISIG} badgeColor="bg-icon-positive" />
    <div className="flex flex-col gap-y-2">
      <BodyText>
        <span className="flex items-center gap-2">
          <span>New multisig wallet added</span>
          {!n.read && <span className="inline-block h-2 w-2 shrink-0 rounded-full bg-icon-accent" />}
        </span>
      </BodyText>
      <BodyText className="inline-flex flex-wrap items-center gap-y-2">
        <span className="text-button-large text-text-primary">{n.multisigAccountName}</span>
        <span className="ml-1 text-text-secondary">
          with threshold {n.threshold} out of {n.signatories}
        </span>
      </BodyText>
    </div>
  </div>
);

// ─── ProxyCreated / ProxyRemoved ─────────────────────────────────────────────
// Line 1: <proxiedWalletName> with <identicon> <address>
// Line 2: <chain> is now available for <walletIcon> <proxyWalletName> to control <proxyType>

const ProxyNotificationContent = ({ n }: { n: MockNotification }) => {
  const isCreated = n.type === 'proxy_created';
  const title = isCreated ? 'New delegated authority wallet added' : 'Delegated authority wallet has been removed';

  return (
    <div className="flex gap-x-2">
      <WalletIconWithBadge type={WalletType.PROXIED} badgeColor={isCreated ? 'bg-icon-positive' : 'bg-icon-negative'} />
      <div className="flex flex-col gap-y-2">
        <BodyText>
          <span className="flex items-center gap-2">
            <span>{title}</span>
            {!n.read && <span className="inline-block h-2 w-2 shrink-0 rounded-full bg-icon-accent" />}
          </span>
        </BodyText>
        {/* Line 1: proxied wallet + address */}
        <BodyText className="inline-flex flex-wrap items-center gap-y-2">
          <span className="text-button-large text-text-primary">{n.proxiedWalletName}</span>
          <span className="mx-1 text-text-secondary">with</span>
          <span className="inline-flex items-center">
            <span className="mx-1 inline-flex">
              <Identicon address={n.proxiedAddress ?? n.issuer} size={16} background={false} />
            </span>
            <span className="text-text-primary">
              <Hash value={n.proxiedAddress ?? n.issuer} variant="truncate" />
            </span>
          </span>
        </BodyText>
        {/* Line 2: chain + proxy wallet + proxy type */}
        <BodyText className="inline-flex flex-wrap items-center gap-y-2 text-text-secondary">
          <InlineChainTitle chainName={n.chainName} fontClass="text-text-primary" />
          <span>{isCreated ? 'is now available for your' : 'is no longer available for your'}</span>
          <span className="mx-1 inline-flex items-center">
            <span className="mx-1">
              {n.proxyWalletType ? (
                <WalletIcon size={16} type={n.proxyWalletType} />
              ) : (
                <Identicon address={n.issuer} size={16} background={false} />
              )}
            </span>
            <span>{n.proxyWalletName}</span>
          </span>
          <span>to control {n.proxyType}</span>
        </BodyText>
      </div>
    </div>
  );
};

// ─── Notification row ────────────────────────────────────────────────────────

const NotificationRow = ({ notification }: { notification: MockNotification }) => {
  const renderContent = () => {
    switch (notification.type) {
      case 'multisig_operation':
        return <MultisigOperationContent n={notification} />;
      case 'multisig_event':
        return <MultisigEventContent n={notification} />;
      case 'multisig_created':
        return <MultisigCreatedContent n={notification} />;
      case 'proxy_created':
      case 'proxy_removed':
        return <ProxyNotificationContent n={notification} />;
      default:
        return null;
    }
  };

  return (
    <li className="flex justify-between rounded-sm bg-block-background-default p-4">
      {renderContent()}
      <FootnoteText className="shrink-0 pl-4 text-text-tertiary">{notification.time}</FootnoteText>
    </li>
  );
};

// ─── Settings modal ──────────────────────────────────────────────────────────

const SettingsModal = ({ isOpen, onClose }: { isOpen: boolean; onClose: () => void }) => {
  const [soundEnabled, setSoundEnabled] = useState(true);
  const [walletCreated, setWalletCreated] = useState(true);
  const [opCreated, setOpCreated] = useState(true);
  const [opExecuted, setOpExecuted] = useState(true);
  const [opRejected, setOpRejected] = useState(true);

  return (
    <Modal isOpen={isOpen} size="md" onToggle={onClose}>
      <Modal.Title close>Notification Settings</Modal.Title>
      <Modal.Content>
        <div className="flex flex-col gap-6 px-5 py-4">
          <div className="flex items-center justify-between">
            <FootnoteText className="text-text-primary">Notification sound</FootnoteText>
            <Switch checked={soundEnabled} onChange={() => setSoundEnabled(!soundEnabled)} />
          </div>
          <div className="flex flex-col gap-3">
            <SmallTitleText className="text-text-primary">Event types</SmallTitleText>
            <div className="flex flex-col gap-2">
              {[
                { label: 'Wallet created', checked: walletCreated, toggle: () => setWalletCreated(!walletCreated) },
                { label: 'Operation created', checked: opCreated, toggle: () => setOpCreated(!opCreated) },
                { label: 'Operation executed', checked: opExecuted, toggle: () => setOpExecuted(!opExecuted) },
                { label: 'Operation rejected', checked: opRejected, toggle: () => setOpRejected(!opRejected) },
              ].map((item) => (
                <div key={item.label} className="flex items-center justify-between py-1">
                  <FootnoteText className="text-text-primary">{item.label}</FootnoteText>
                  <Switch checked={item.checked} onChange={item.toggle} />
                </div>
              ))}
            </div>
          </div>
        </div>
      </Modal.Content>
      <Modal.Footer>
        <Button onClick={onClose}>Save</Button>
      </Modal.Footer>
    </Modal>
  );
};

// ─── Main prototype ──────────────────────────────────────────────────────────

const getWalletName = (n: MockNotification): string => {
  const w = WALLETS.find((w) => w.id === n.walletId);

  return w?.name ?? n.multisigAccountName ?? '';
};

const NotificationsPrototype = () => {
  const [search, setSearch] = useState('');
  const [tab, setTab] = useState('all');
  const [walletFilter, setWalletFilter] = useState('');
  const [typeFilter, setTypeFilter] = useState('');
  const [networkFilter, setNetworkFilter] = useState('');
  const [settingsOpen, setSettingsOpen] = useState(false);

  const unreadCount = NOTIFICATIONS.filter((n) => !n.read).length;

  const filtered = useMemo(() => {
    return NOTIFICATIONS.filter((n) => {
      if (tab === 'unread' && n.read) return false;
      if (walletFilter && n.walletId !== walletFilter) return false;

      if (typeFilter) {
        if (typeFilter === 'wallet_created' && n.type !== 'multisig_created') return false;
        if (typeFilter === 'op_created' && (n.type !== 'multisig_operation' || n.status !== 'info')) return false;
        if (typeFilter === 'op_executed' && n.status !== 'success') return false;
        if (typeFilter === 'op_rejected' && n.status !== 'error') return false;
        if (typeFilter === 'proxy' && !n.type.startsWith('proxy')) return false;
      }

      if (networkFilter) {
        if (networkFilter === 'polkadot' && !n.chainName.startsWith('Polkadot')) return false;
        if (networkFilter === 'kusama' && !n.chainName.startsWith('Kusama')) return false;
      }

      if (search) {
        const q = search.toLowerCase();
        const walletName = getWalletName(n).toLowerCase();

        return (
          (n.opTitle ?? '').toLowerCase().includes(q) ||
          walletName.includes(q) ||
          n.chainName.toLowerCase().includes(q) ||
          (n.signerName ?? '').toLowerCase().includes(q) ||
          (n.proxiedWalletName ?? '').toLowerCase().includes(q)
        );
      }

      return true;
    });
  }, [search, tab, walletFilter, typeFilter, networkFilter]);

  const grouped = useMemo(() => {
    const groups: Record<string, MockNotification[]> = {};
    for (const n of filtered) {
      const group = groups[n.dateGroup] ?? [];
      group.push(n);
      groups[n.dateGroup] = group;
    }

    return Object.entries(groups);
  }, [filtered]);

  const hasActiveFilters = walletFilter || typeFilter || networkFilter;

  return (
    <div className="flex min-h-[600px] w-full flex-col bg-main-app-background">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-container-border bg-top-nav-bar-background px-6 pt-4 pb-[15px]">
        <div className="flex items-center gap-3">
          <TitleText className="py-[3px] text-text-primary">Notifications</TitleText>
          {unreadCount > 0 && <Counter variant="waiting">{unreadCount}</Counter>}
        </div>
        <div className="flex items-center gap-x-2">
          <div className="w-[230px]">
            <SearchInput value={search} placeholder="Search by wallet or event type" onChange={setSearch} />
          </div>
          <IconButton name="settingsLite" className="p-1.5" onClick={() => setSettingsOpen(true)} />
        </div>
      </div>

      {/* Content */}
      <div className="mt-4 flex h-full w-full flex-1 flex-col items-center overflow-y-auto pl-6">
        <div className="w-[736px]">
          {/* Tabs + filters row */}
          <div className="flex items-center justify-between pb-4">
            <Tabs value={tab} onChange={setTab}>
              <Tabs.List>
                <Tabs.Trigger value="all">All</Tabs.Trigger>
                <Tabs.Trigger value="unread">
                  Unread {unreadCount > 0 && <span className="ml-1 text-text-tertiary">{unreadCount}</span>}
                </Tabs.Trigger>
              </Tabs.List>
            </Tabs>

            <div className="flex h-9 items-center gap-2">
              <div className="w-[150px]">
                <Select placeholder="All wallets" value={walletFilter} onChange={setWalletFilter}>
                  <Select.Item value="">All wallets</Select.Item>
                  {WALLETS.map((w) => (
                    <Select.Item key={w.id} value={w.id}>
                      {w.name}
                    </Select.Item>
                  ))}
                </Select>
              </div>
              <div className="w-[150px]">
                <Select placeholder="Event type" value={typeFilter} onChange={setTypeFilter}>
                  <Select.Item value="">All events</Select.Item>
                  <Select.Item value="wallet_created">Wallet created</Select.Item>
                  <Select.Item value="op_created">Operation created</Select.Item>
                  <Select.Item value="op_executed">Operation executed</Select.Item>
                  <Select.Item value="op_rejected">Operation rejected</Select.Item>
                  <Select.Item value="proxy">Proxy events</Select.Item>
                </Select>
              </div>
              <div className="w-[136px]">
                <Select placeholder="Network" value={networkFilter} onChange={setNetworkFilter}>
                  <Select.Item value="">All networks</Select.Item>
                  <Select.Item value="polkadot">Polkadot</Select.Item>
                  <Select.Item value="kusama">Kusama</Select.Item>
                </Select>
              </div>
              {hasActiveFilters && (
                <Button
                  variant="text"
                  size="sm"
                  onClick={() => {
                    setWalletFilter('');
                    setTypeFilter('');
                    setNetworkFilter('');
                  }}
                >
                  Clear
                </Button>
              )}
            </div>
          </div>

          {/* Notification list */}
          {filtered.length === 0 ? (
            <div className="flex flex-col items-center justify-center gap-3 py-20">
              <Icon name="noResults" size={48} className="text-icon-default" />
              <FootnoteText className="text-text-tertiary">No notifications found</FootnoteText>
              {(search || hasActiveFilters) && (
                <HelpText className="text-text-tertiary">Try adjusting your search or filters</HelpText>
              )}
            </div>
          ) : (
            <div className="flex flex-col pb-10">
              {grouped.map(([date, notifications]) => (
                <Accordion key={date} initialOpen>
                  <Accordion.Trigger>
                    <div className="flex items-center gap-2 py-2">
                      <FootnoteText className="text-text-tertiary uppercase">{date}</FootnoteText>
                      <CaptionText className="text-text-tertiary">({notifications.length})</CaptionText>
                    </div>
                  </Accordion.Trigger>
                  <Accordion.Content>
                    <ul className="flex flex-col gap-y-1.5">
                      {notifications.map((n) => (
                        <NotificationRow key={n.id} notification={n} />
                      ))}
                    </ul>
                  </Accordion.Content>
                </Accordion>
              ))}
            </div>
          )}
        </div>
      </div>

      <SettingsModal isOpen={settingsOpen} onClose={() => setSettingsOpen(false)} />
    </div>
  );
};

const meta: Meta<typeof NotificationsPrototype> = {
  component: NotificationsPrototype,
  title: 'Prototypes/Notifications',
  parameters: {
    layout: 'fullscreen',
  },
};

export default meta;

type Story = StoryObj<typeof NotificationsPrototype>;

export const Default: Story = {};
