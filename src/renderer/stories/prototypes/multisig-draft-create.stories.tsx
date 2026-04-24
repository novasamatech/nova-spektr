import { type Meta, type StoryObj } from '@storybook/react-vite';
import { type ReactNode, useMemo, useState } from 'react';

import { type Address, type Chain, WalletType } from '@/shared/core';
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
} from '@/shared/ui';
import { ChainIcon, Identicon } from '@/shared/ui-entities';
import { Box, Input, Modal, Popover, Select, Tabs } from '@/shared/ui-kit';

import {
  AccountIdenticon,
  CopyableIconButton,
  CopyableValue,
  MOCK_ADDRESSES,
  MOCK_CHAINS,
  truncateStr,
} from './_shared';

// ─── Mock data ───────────────────────────────────────────────────────────────

type Signatory = {
  id: string;
  name: string;
  address: Address;
  walletType: WalletType;
  isOwn: boolean;
};

type MultisigAccount = {
  id: string;
  name: string;
  address: Address;
  threshold: number;
  signatories: Signatory[];
  nestedMultisigIds?: string[];
};

type SourceAccount = {
  id: string;
  name: string;
  address: Address;
  kind: 'multisig' | 'proxied';
  walletType: WalletType;
  proxyType?: string;
  multisigIds: string[];
};

type PathNode = { kind: 'source'; id: string } | { kind: 'multisig'; id: string } | { kind: 'signer'; id: string };

const SIGNATORIES = {
  alice: {
    id: 'alice',
    name: 'Alice · Vault',
    address: MOCK_ADDRESSES.alice,
    walletType: WalletType.POLKADOT_VAULT,
    isOwn: true,
  },
  bob: {
    id: 'bob',
    name: 'Bob · Nova Wallet',
    address: MOCK_ADDRESSES.bob,
    walletType: WalletType.NOVA_WALLET,
    isOwn: true,
  },
  charlie: {
    id: 'charlie',
    name: 'Charlie · Talisman',
    address: MOCK_ADDRESSES.charlie,
    walletType: WalletType.TALISMAN_EXTENSION,
    isOwn: false,
  },
  dave: {
    id: 'dave',
    name: 'Dave · WalletConnect',
    address: MOCK_ADDRESSES.dave,
    walletType: WalletType.WALLET_CONNECT,
    isOwn: false,
  },
  eve: {
    id: 'eve',
    name: 'Eve · Vault',
    address: MOCK_ADDRESSES.eve,
    walletType: WalletType.POLKADOT_VAULT,
    isOwn: true,
  },
} satisfies Record<string, Signatory>;

const MULTISIGS = {
  'security-council': {
    id: 'security-council',
    name: 'Security Council',
    address: '5HpG9w8EBLe5XCrbczpwq5TSXvedjrBGCwqxK1iQ7qUsSWFc' as Address,
    threshold: 3,
    signatories: [SIGNATORIES.alice, SIGNATORIES.bob, SIGNATORIES.charlie, SIGNATORIES.dave],
  },
  'company-ops': {
    id: 'company-ops',
    name: 'Company Ops',
    address: '5FLSigC9HGRKVhB9FiEo4Y3koPsNmBmLJbpXg2mp1hXcS59Y' as Address,
    threshold: 2,
    signatories: [SIGNATORIES.alice, SIGNATORIES.bob, SIGNATORIES.charlie],
  },
  'dev-team': {
    id: 'dev-team',
    name: 'Dev Team',
    address: '5CiPPseXPECbkjWCa6MnjNokrgYjMqmKndv2rSnekmSK2DjL' as Address,
    threshold: 2,
    signatories: [SIGNATORIES.alice, SIGNATORIES.eve, SIGNATORIES.charlie, SIGNATORIES.dave],
  },
  'vault-guardians': {
    id: 'vault-guardians',
    name: 'Vault Guardians',
    address: MOCK_ADDRESSES.alice,
    threshold: 1,
    signatories: [SIGNATORIES.alice, SIGNATORIES.eve],
  },
  'founders-council': {
    id: 'founders-council',
    name: 'Founders Council',
    address: MOCK_ADDRESSES.bob,
    threshold: 2,
    signatories: [SIGNATORIES.eve],
    nestedMultisigIds: ['vault-guardians'],
  },
} satisfies Record<string, MultisigAccount>;

const SOURCES = {
  'treasury-proxy': {
    id: 'treasury-proxy',
    name: 'Treasury Pure Proxy',
    address: '5DAAnrj7VHTznn2AWBemMuyBwZWs6FNFjdyVXUeYum3PTXFy' as Address,
    kind: 'proxied',
    walletType: WalletType.PROXIED,
    proxyType: 'Any',
    multisigIds: ['security-council', 'company-ops'],
  },
  'ops-proxy': {
    id: 'ops-proxy',
    name: 'Ops Pure Proxy',
    address: MOCK_ADDRESSES.eve,
    kind: 'proxied',
    walletType: WalletType.PROXIED,
    proxyType: 'Non-transfer',
    multisigIds: ['company-ops'],
  },
  'founders-proxy': {
    id: 'founders-proxy',
    name: 'Founders Pure Proxy',
    address: MOCK_ADDRESSES.charlie,
    kind: 'proxied',
    walletType: WalletType.PROXIED,
    proxyType: 'Any',
    multisigIds: ['founders-council'],
  },
  'security-council': {
    id: 'security-council',
    name: 'Security Council',
    address: MULTISIGS['security-council'].address,
    kind: 'multisig',
    walletType: WalletType.MULTISIG,
    multisigIds: ['security-council'],
  },
  'dev-team': {
    id: 'dev-team',
    name: 'Dev Team',
    address: MULTISIGS['dev-team'].address,
    kind: 'multisig',
    walletType: WalletType.MULTISIG,
    multisigIds: ['dev-team'],
  },
} satisfies Record<string, SourceAccount>;

const CHAIN_OPTIONS: { id: string; chain: Chain }[] = [
  { id: 'polkadot-ah', chain: MOCK_CHAINS.polkadotAssetHub },
  { id: 'polkadot', chain: MOCK_CHAINS.polkadot },
  { id: 'kusama', chain: MOCK_CHAINS.kusama },
  { id: 'westend', chain: MOCK_CHAINS.westend },
];

const SAMPLE_CALL_DATA = '0xab060300014e23d84b2bafde3c5b38a2b04c2b89e39c76d85e0dd63e2e2bb47bc0a9020013000064a7b3b6e00d';
const SAMPLE_CALL_HASH = '0x8a3f9b2c1d4e5f6a7b8c9d0e1f2a3b4c5d6e7f8a9b0c1d2e3f4a5b6c7d8e9f0a';

// ─── Helpers ─────────────────────────────────────────────────────────────────

const cls = (...parts: (string | false | undefined)[]) => parts.filter(Boolean).join(' ');

const getMultisig = (id: string): MultisigAccount | undefined => (MULTISIGS as Record<string, MultisigAccount>)[id];

const getSource = (id: string): SourceAccount | undefined => (SOURCES as Record<string, SourceAccount>)[id];

const getSignatory = (id: string): Signatory | undefined => (SIGNATORIES as Record<string, Signatory>)[id];

const totalMembers = (m: MultisigAccount) => m.signatories.length + (m.nestedMultisigIds?.length ?? 0);

type NextOption = { kind: 'signer'; id: string } | { kind: 'multisig'; id: string };

const getNextOptions = (node: PathNode): NextOption[] => {
  if (node.kind === 'source') {
    const src = getSource(node.id);
    if (!src) return [];
    if (src.kind === 'proxied') {
      return src.multisigIds.map((id) => ({ kind: 'multisig' as const, id }));
    }
    const m = getMultisig(src.id);
    if (!m) return [];
    return [
      ...m.signatories.map((s) => ({ kind: 'signer' as const, id: s.id })),
      ...(m.nestedMultisigIds ?? []).map((id) => ({ kind: 'multisig' as const, id })),
    ];
  }
  if (node.kind === 'multisig') {
    const m = getMultisig(node.id);
    if (!m) return [];
    return [
      ...m.signatories.map((s) => ({ kind: 'signer' as const, id: s.id })),
      ...(m.nestedMultisigIds ?? []).map((id) => ({ kind: 'multisig' as const, id })),
    ];
  }
  return [];
};

type PathNodeView = {
  label: string;
  title: string;
  subtitle: string;
  address: Address;
  walletType?: WalletType;
};

const nodeView = (node: PathNode): PathNodeView | null => {
  if (node.kind === 'source') {
    const s = getSource(node.id);
    if (!s) return null;
    return {
      label: 'Source',
      title: s.name,
      subtitle: s.kind === 'proxied' ? `Proxied · ${s.proxyType}` : 'Multisig',
      address: s.address,
      walletType: s.walletType,
    };
  }
  if (node.kind === 'multisig') {
    const m = getMultisig(node.id);
    if (!m) return null;
    return {
      label: 'via Multisig',
      title: m.name,
      subtitle: `${m.threshold} of ${totalMembers(m)}`,
      address: m.address,
      walletType: WalletType.MULTISIG,
    };
  }
  const sig = getSignatory(node.id);
  if (!sig) return null;
  return {
    label: 'Initiator',
    title: sig.name,
    subtitle: truncateStr(sig.address, 6, 6),
    address: sig.address,
    walletType: sig.walletType,
  };
};

// ─── Step Indicator ──────────────────────────────────────────────────────────

const STEP_LABELS = ['Transaction', 'Signing path', 'Review'];

const StepIndicator = ({ step }: { step: number }) => (
  <div className="flex items-center justify-center gap-1 pt-1 pb-6">
    {STEP_LABELS.map((label, idx) => {
      const num = idx + 1;
      const done = num < step;
      const active = num === step;

      return (
        <div key={label} className="flex items-center gap-2">
          <div
            className={cls(
              'flex items-center gap-2 rounded-full py-1 pr-3 pl-1 transition-colors',
              active && 'bg-icon-accent/10',
            )}
          >
            <div
              className={cls(
                'flex h-6 w-6 items-center justify-center rounded-full',
                done && 'bg-text-positive',
                active && 'bg-icon-accent',
                !done && !active && 'bg-input-background-disabled',
              )}
            >
              {done ? (
                <Icon name="checkmark" size={12} className="text-white" />
              ) : (
                <CaptionText className={active ? 'text-white' : 'text-text-tertiary'}>{num}</CaptionText>
              )}
            </div>
            <CaptionText
              className={cls(
                'uppercase',
                active && 'text-icon-accent',
                done && 'text-text-secondary',
                !done && !active && 'text-text-tertiary',
              )}
            >
              {label}
            </CaptionText>
          </div>
          {num < STEP_LABELS.length && (
            <div className={cls('h-px w-6', done ? 'bg-text-positive' : 'bg-input-background-disabled')} />
          )}
        </div>
      );
    })}
  </div>
);

// ─── Path breadcrumb card ────────────────────────────────────────────────────

type PathCardSize = 'sm' | 'md';

const PathCard = ({
  view,
  size = 'md',
  onClick,
}: {
  view: PathNodeView;
  size?: PathCardSize;
  onClick?: () => void;
}) => {
  const inner = (
    <div
      className={cls(
        'flex min-w-0 flex-1 flex-col rounded-lg border border-container-border bg-white',
        size === 'md' ? 'gap-y-2.5 p-4' : 'gap-y-1.5 px-3.5 py-2.5',
        onClick && 'cursor-pointer transition-colors hover:bg-action-background-hover',
      )}
    >
      <CaptionText className="text-text-tertiary uppercase">{view.label}</CaptionText>
      <div className="flex min-w-0 items-center gap-2">
        <AccountIdenticon
          address={view.address}
          walletType={view.walletType}
          size={size === 'md' ? 28 : 22}
          badgeSize={12}
        />
        <div className="flex min-w-0 flex-col">
          <BodyText className="truncate text-text-primary">{view.title}</BodyText>
          <HelpText className="truncate text-text-tertiary">{view.subtitle}</HelpText>
        </div>
      </div>
    </div>
  );

  if (onClick) {
    return (
      <button type="button" className="flex min-w-0 flex-1" onClick={onClick}>
        {inner}
      </button>
    );
  }

  return inner;
};

const PathArrow = () => (
  <div className="flex shrink-0 items-center">
    <Icon name="right" size={16} className="text-text-tertiary" />
  </div>
);

const EllipsisCard = ({ hiddenViews, size = 'sm' }: { hiddenViews: PathNodeView[]; size?: PathCardSize }) => (
  <Popover>
    <Popover.Trigger>
      <button
        type="button"
        className={cls(
          'flex shrink-0 cursor-pointer flex-col items-center justify-center gap-1 rounded-lg border border-container-border bg-white transition-colors hover:bg-action-background-hover',
          size === 'md' ? 'min-w-[68px] px-3 py-4' : 'min-w-[52px] px-3 py-2.5',
        )}
      >
        <CaptionText className="text-text-tertiary uppercase">+{hiddenViews.length}</CaptionText>
        <div className="flex items-center gap-0.5">
          <div className="h-1 w-1 rounded-full bg-text-tertiary" />
          <div className="h-1 w-1 rounded-full bg-text-tertiary" />
          <div className="h-1 w-1 rounded-full bg-text-tertiary" />
        </div>
      </button>
    </Popover.Trigger>
    <Popover.Content>
      <div className="flex w-[300px] flex-col gap-y-2 p-3">
        <CaptionText className="text-text-tertiary uppercase">Full path</CaptionText>
        <div className="flex flex-col gap-y-2">
          {hiddenViews.map((v, i) => (
            <div key={`${v.label}-${i}`} className="flex items-center gap-2.5">
              <AccountIdenticon address={v.address} walletType={v.walletType} size={24} badgeSize={10} />
              <div className="flex min-w-0 flex-col">
                <CaptionText className="text-text-tertiary uppercase">{v.label}</CaptionText>
                <FootnoteText className="truncate text-text-primary">{v.title}</FootnoteText>
                <HelpText className="truncate text-text-tertiary">{v.subtitle}</HelpText>
              </div>
            </div>
          ))}
        </div>
      </div>
    </Popover.Content>
  </Popover>
);

const renderBreadcrumbCards = (views: PathNodeView[], size: PathCardSize, onNodeClick?: (index: number) => void) => {
  const elements: ReactNode[] = [];
  const MAX = 3;

  if (views.length <= MAX) {
    return views.flatMap((v, i) => {
      const arrow = i > 0 ? [<PathArrow key={`arrow-${v.label}-${i}`} />] : [];
      return [
        ...arrow,
        <PathCard
          key={`card-${v.label}-${i}`}
          view={v}
          size={size}
          onClick={onNodeClick ? () => onNodeClick(i) : undefined}
        />,
      ];
    });
  }

  const first = views[0];
  const hidden = views.slice(1, views.length - 1);
  const last = views[views.length - 1];

  if (first) {
    elements.push(
      <PathCard key="first" view={first} size={size} onClick={onNodeClick ? () => onNodeClick(0) : undefined} />,
    );
  }
  elements.push(<PathArrow key="arrow-first" />);
  elements.push(<EllipsisCard key="ellipsis" hiddenViews={hidden} size={size} />);
  elements.push(<PathArrow key="arrow-last" />);
  if (last) {
    elements.push(
      <PathCard
        key="last"
        view={last}
        size={size}
        onClick={onNodeClick ? () => onNodeClick(views.length - 1) : undefined}
      />,
    );
  }
  return elements;
};

const PathBreadcrumb = ({
  path,
  size = 'sm',
  onNodeClick,
}: {
  path: PathNode[];
  size?: PathCardSize;
  onNodeClick?: (index: number) => void;
}) => {
  const views = path.map(nodeView).filter((v): v is PathNodeView => v !== null);

  if (views.length === 0) {
    return (
      <div className="flex items-center justify-center rounded-lg border border-dashed border-shade-12 bg-block-background-default px-4 py-6">
        <FootnoteText className="text-text-tertiary">Pick a source account to start</FootnoteText>
      </div>
    );
  }

  return (
    <div className="flex items-stretch gap-2 rounded-lg bg-block-background-default p-3">
      {renderBreadcrumbCards(views, size, onNodeClick)}
    </div>
  );
};

// ─── Step 1: Transaction ─────────────────────────────────────────────────────

const StepTransaction = ({
  chainId,
  setChainId,
  mode,
  setMode,
  callData,
  setCallData,
}: {
  chainId: string;
  setChainId: (v: string) => void;
  mode: 'paste' | 'build';
  setMode: (v: 'paste' | 'build') => void;
  callData: string;
  setCallData: (v: string) => void;
}) => {
  const decodedJson = useMemo(
    () =>
      callData.trim().length > 0
        ? JSON.stringify(
            {
              section: 'balances',
              method: 'transferKeepAlive',
              args: {
                dest: {
                  Id: '14Hkt4rCpaKK5GGFaRVQ4uJ8gv4FjvLm2nPXSqkp5UjVLm',
                },
                value: '10000000000',
              },
            },
            null,
            2,
          )
        : null,
    [callData],
  );

  return (
    <Box direction="column" gap={4}>
      <div className="flex flex-col gap-y-1.5">
        <FootnoteText className="text-text-secondary">Network</FootnoteText>
        <Select placeholder="Select a network" value={chainId} onChange={setChainId}>
          {CHAIN_OPTIONS.map((opt) => (
            <Select.Item key={opt.id} value={opt.id}>
              <div className="flex w-full items-center gap-2">
                <ChainIcon chain={opt.chain} size={20} />
                <FootnoteText className="text-text-primary">{opt.chain.name}</FootnoteText>
              </div>
            </Select.Item>
          ))}
        </Select>
      </div>

      <Tabs value={mode} onChange={(v) => setMode(v as 'paste' | 'build')}>
        <Tabs.List>
          <Tabs.Trigger value="paste">Paste</Tabs.Trigger>
          <Tabs.Trigger value="build">Build</Tabs.Trigger>
        </Tabs.List>
        <Tabs.Content value="paste">
          <div className="flex flex-col gap-y-1.5 pt-3">
            <FootnoteText className="text-text-secondary">Call data</FootnoteText>
            <Input
              placeholder="Paste the call data here"
              value={callData}
              height="md"
              width="full"
              onChange={setCallData}
            />
          </div>
        </Tabs.Content>
        <Tabs.Content value="build">
          <div className="flex flex-col gap-y-1.5 pt-3">
            <FootnoteText className="text-text-secondary">Call data</FootnoteText>
            <div className="flex flex-col items-center justify-center gap-1.5 rounded-md border border-dashed border-shade-12 bg-white py-10">
              <Icon name="magic" size={20} className="text-icon-default" />
              <FootnoteText className="text-text-tertiary">Interactive builder coming up…</FootnoteText>
            </div>
          </div>
        </Tabs.Content>
      </Tabs>

      {decodedJson ? (
        <div className="flex flex-col gap-y-1.5">
          <div className="flex items-center justify-between">
            <FootnoteText className="text-text-secondary">Call preview</FootnoteText>
            <CopyableIconButton value={decodedJson} tooltip="Copy JSON" />
          </div>
          <pre className="overflow-x-auto rounded-md border border-container-border bg-input-background px-3 py-2 font-mono text-help-text text-text-secondary">
            {decodedJson}
          </pre>
        </div>
      ) : (
        <div className="flex flex-col items-center justify-center gap-2 py-10">
          <Icon name="document" size={40} className="text-icon-default" />
          <BodyText className="text-text-primary">No data available</BodyText>
          <HelpText className="text-text-tertiary">Operation details will appear here after call data parsed</HelpText>
        </div>
      )}
    </Box>
  );
};

// ─── Step 2: Signing path ────────────────────────────────────────────────────

const RowPickerButton = ({
  address,
  walletType,
  title,
  subtitle,
  selected,
  trailing,
  onClick,
}: {
  address: Address;
  walletType?: WalletType;
  title: string;
  subtitle: string;
  selected: boolean;
  trailing?: ReactNode;
  onClick: () => void;
}) => (
  <button
    type="button"
    className={cls(
      'flex w-full cursor-pointer items-center gap-3 rounded-lg border px-3.5 py-3 text-left transition-all',
      selected
        ? 'border-icon-accent bg-icon-accent/6 shadow-card-shadow'
        : 'border-container-border bg-white hover:border-icon-accent/40 hover:bg-action-background-hover',
    )}
    onClick={onClick}
  >
    <AccountIdenticon address={address} walletType={walletType} size={32} />
    <div className="flex min-w-0 flex-1 flex-col">
      <BodyText className="truncate text-text-primary">{title}</BodyText>
      <HelpText className="truncate text-text-tertiary">{subtitle}</HelpText>
    </div>
    {trailing}
    <div
      className={cls(
        'flex h-5 w-5 items-center justify-center rounded-full border-2 transition-colors',
        selected ? 'border-icon-accent bg-icon-accent' : 'border-shade-12',
      )}
    >
      {selected && <div className="h-1.5 w-1.5 rounded-full bg-white" />}
    </div>
  </button>
);

const SectionCard = ({
  number,
  title,
  description,
  hint,
  children,
}: {
  number: number;
  title: string;
  description: string;
  hint?: string;
  children: ReactNode;
}) => (
  <div className="flex flex-col gap-y-4 rounded-lg border border-container-border bg-white p-5">
    <div className="flex items-start gap-3">
      <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-icon-accent/12">
        <CaptionText className="text-icon-accent">{number}</CaptionText>
      </div>
      <div className="flex min-w-0 flex-1 flex-col gap-y-1">
        <BodyText className="text-text-primary">{title}</BodyText>
        <HelpText className="text-text-tertiary">{description}</HelpText>
      </div>
      {hint && (
        <div className="flex items-center gap-1 rounded-md bg-badge-background px-2 py-1">
          <Icon name="magic" size={12} className="text-icon-accent" />
          <HelpText className="text-icon-accent">{hint}</HelpText>
        </div>
      )}
    </div>
    <div className="flex flex-col gap-y-2">{children}</div>
  </div>
);

const NextOptionRow = ({
  option,
  selected,
  onClick,
}: {
  option: NextOption;
  selected: boolean;
  onClick: () => void;
}) => {
  if (option.kind === 'signer') {
    const sig = getSignatory(option.id);
    if (!sig) return null;
    return (
      <RowPickerButton
        address={sig.address}
        title={sig.name}
        subtitle={truncateStr(sig.address, 8, 8)}
        selected={selected}
        onClick={onClick}
      />
    );
  }

  const m = getMultisig(option.id);
  if (!m) return null;
  return (
    <RowPickerButton
      address={m.address}
      walletType={WalletType.MULTISIG}
      title={m.name}
      subtitle={`Nested multisig · ${m.threshold} of ${totalMembers(m)}`}
      selected={selected}
      trailing={
        <div className="flex items-center rounded-full border border-icon-accent/30 bg-icon-accent/8 px-2 py-0.5">
          <CaptionText className="text-icon-accent">
            {m.threshold}/{totalMembers(m)}
          </CaptionText>
        </div>
      }
      onClick={onClick}
    />
  );
};

const getActivePickerTitle = (last: PathNode): { title: string; description: string } => {
  if (last.kind === 'source') {
    const s = getSource(last.id);
    if (s?.kind === 'proxied') {
      const count = s.multisigIds.length;
      return {
        title: 'Pick a multisig to sign via',
        description: `${count} multisig${count === 1 ? '' : 's'} can sign for this proxy`,
      };
    }
    return {
      title: 'Pick an initiator',
      description: 'Who will initiate this direct multisig',
    };
  }
  if (last.kind === 'multisig') {
    const m = getMultisig(last.id);
    const hasNested = (m?.nestedMultisigIds?.length ?? 0) > 0;
    return {
      title: hasNested ? 'Pick an initiator or nested multisig' : 'Pick an initiator',
      description: hasNested
        ? 'This multisig includes a nested multisig as a member'
        : 'Who will initiate this multisig',
    };
  }
  return { title: 'Path complete', description: '' };
};

const STEP_ANIM_KEYFRAMES = `
@keyframes stepPathEnter {
  from { opacity: 0; transform: translateY(8px); }
  to { opacity: 1; transform: translateY(0); }
}
.step-path-anim { animation: stepPathEnter 260ms cubic-bezier(0.22, 1, 0.36, 1); }
`;

const StepPath = ({ path, setPath }: { path: PathNode[]; setPath: (p: PathNode[]) => void }) => {
  const sourceId = path[0]?.kind === 'source' ? path[0].id : '';
  const last = path[path.length - 1];
  const complete = last?.kind === 'signer';
  const nextOptions = last && !complete ? getNextOptions(last) : [];
  const activePickerInfo = last && !complete ? getActivePickerTitle(last) : null;

  const truncateTo = (index: number) => setPath(path.slice(0, index));
  const handleSourceChange = (v: string) => setPath([{ kind: 'source', id: v }]);
  const appendNode = (opt: NextOption) => setPath([...path, opt]);

  const activeStepKey = complete ? 'complete' : `step-${path.length}`;

  return (
    <Box direction="column" gap={4}>
      <style>{STEP_ANIM_KEYFRAMES}</style>

      {path.length > 0 && <PathBreadcrumb path={path} onNodeClick={truncateTo} />}

      <div key={activeStepKey} className="step-path-anim">
        {!last ? (
          <SectionCard number={1} title="Source account" description="The account that executes the transaction">
            <Select placeholder="Select a source account" value={sourceId} onChange={handleSourceChange}>
              {Object.values(SOURCES).map((s) => {
                const linked = getMultisig(s.id);
                const subtitle =
                  s.kind === 'proxied'
                    ? `Proxied · ${s.proxyType} · ${s.multisigIds.length} multisig${s.multisigIds.length > 1 ? 's' : ''} with access`
                    : linked
                      ? `Direct multisig · ${linked.threshold} of ${totalMembers(linked)}`
                      : 'Multisig';

                return (
                  <Select.Item key={s.id} value={s.id}>
                    <div className="flex w-full items-center gap-3 py-0.5">
                      <AccountIdenticon address={s.address} walletType={s.walletType} size={28} badgeSize={12} />
                      <div className="flex min-w-0 flex-col">
                        <FootnoteText className="truncate text-text-primary">{s.name}</FootnoteText>
                        <HelpText className="truncate text-text-tertiary">{subtitle}</HelpText>
                      </div>
                    </div>
                  </Select.Item>
                );
              })}
            </Select>
          </SectionCard>
        ) : complete ? (
          <div className="flex items-center gap-3 rounded-lg border border-text-positive/30 bg-text-positive/8 p-4">
            <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-text-positive">
              <Icon name="checkmark" size={16} className="text-white" />
            </div>
            <div className="flex flex-col gap-y-0.5">
              <FootnoteText className="text-text-primary">Path complete</FootnoteText>
              <HelpText className="text-text-secondary">
                Click any hop above to edit, or Back to change the last one
              </HelpText>
            </div>
          </div>
        ) : (
          activePickerInfo && (
            <SectionCard
              number={path.length + 1}
              title={activePickerInfo.title}
              description={activePickerInfo.description}
            >
              <div className="flex flex-col gap-y-1.5">
                {nextOptions.length === 0 ? (
                  <div className="rounded-lg border border-dashed border-shade-12 px-3 py-4 text-center">
                    <FootnoteText className="text-text-tertiary">No options available for this hop</FootnoteText>
                  </div>
                ) : (
                  nextOptions.map((opt, idx) => (
                    <NextOptionRow
                      key={`${opt.kind}-${opt.id}-${idx}`}
                      option={opt}
                      selected={false}
                      onClick={() => appendNode(opt)}
                    />
                  ))
                )}
              </div>
            </SectionCard>
          )
        )}
      </div>
    </Box>
  );
};

// ─── Step 3: Review ──────────────────────────────────────────────────────────

const DetailRow2 = ({ label, children }: { label: string; children: ReactNode }) => (
  <div className="flex items-center justify-between gap-3 py-2">
    <FootnoteText className="text-text-tertiary">{label}</FootnoteText>
    <div className="flex min-w-0 items-center gap-1.5">{children}</div>
  </div>
);

const StepReview = ({
  path,
  description,
  setDescription,
}: {
  path: PathNode[];
  description: string;
  setDescription: (v: string) => void;
}) => (
  <Box direction="column" gap={5}>
    <div className="flex flex-col gap-y-3 rounded-lg bg-block-background-default p-4">
      <div className="flex items-center justify-between">
        <CaptionText className="text-text-tertiary uppercase">Signing path</CaptionText>
        <div className="flex items-center gap-3">
          <HelpText className="text-text-tertiary">{path.length} hops</HelpText>
          <Popover>
            <Popover.Trigger>
              <button
                type="button"
                className="flex cursor-pointer items-center gap-1.5 rounded-full border border-container-border bg-white px-2.5 py-1 transition-colors hover:bg-action-background-hover"
              >
                <Icon name="details" size={12} className="text-icon-accent" />
                <CaptionText className="text-icon-accent uppercase">Open overview</CaptionText>
              </button>
            </Popover.Trigger>
            <Popover.Content>
              <div className="flex w-[340px] flex-col gap-y-3 p-4">
                <div className="flex items-center justify-between">
                  <CaptionText className="text-text-tertiary uppercase">Full signing path</CaptionText>
                  <HelpText className="text-text-tertiary">{path.length} hops</HelpText>
                </div>
                <div className="flex flex-col">
                  {path.map((node, idx) => {
                    const v = nodeView(node);
                    if (!v) return null;
                    const isLast = idx === path.length - 1;
                    return (
                      <div key={`ov-${idx}-${node.kind}-${node.id}`} className="flex gap-3">
                        <div className="flex flex-col items-center">
                          <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full border border-container-border bg-white">
                            <CaptionText className="text-text-secondary">{idx + 1}</CaptionText>
                          </div>
                          {!isLast && <div className="h-8 w-px bg-shade-12" />}
                        </div>
                        <div className="flex min-w-0 flex-1 flex-col pb-4">
                          <CaptionText className="text-text-tertiary uppercase">{v.label}</CaptionText>
                          <div className="mt-1 flex min-w-0 items-center gap-2">
                            <AccountIdenticon address={v.address} walletType={v.walletType} size={22} badgeSize={10} />
                            <div className="flex min-w-0 flex-col">
                              <FootnoteText className="truncate text-text-primary">{v.title}</FootnoteText>
                              <HelpText className="truncate text-text-tertiary">{v.subtitle}</HelpText>
                            </div>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </Popover.Content>
          </Popover>
        </div>
      </div>
      <div className="flex items-stretch gap-2">
        {renderBreadcrumbCards(
          path.map(nodeView).filter((v): v is PathNodeView => v !== null),
          'md',
        )}
      </div>
    </div>

    <div className="flex flex-col gap-y-3">
      <HeadlineText className="text-text-primary">Description</HeadlineText>
      <textarea
        value={description}
        placeholder="e.g. Q2 payroll batch to engineering"
        rows={3}
        className="w-full resize-none rounded-md border border-container-border bg-input-background px-3.5 py-2.5 text-footnote text-text-primary placeholder:text-text-tertiary focus:border-icon-accent focus:outline-none"
        onChange={(e) => setDescription(e.target.value)}
      />
      <HelpText className="text-text-tertiary">Shown to co-signers in the drafts list</HelpText>
    </div>

    <div className="flex flex-col rounded-lg border border-container-border bg-white">
      <div className="flex items-center justify-between px-4 py-3.5">
        <SmallTitleText className="text-text-primary">Transaction</SmallTitleText>
        <div className="flex items-center gap-1.5 rounded-full bg-icon-accent/8 px-2.5 py-1">
          <Icon name="transferConfirm" size={12} className="text-icon-accent" />
          <CaptionText className="text-icon-accent uppercase">Balances · transferKeepAlive</CaptionText>
        </div>
      </div>
      <Separator />
      <div className="flex flex-col gap-y-1 px-4 py-3">
        <DetailRow2 label="Network">
          <ChainIcon chain={MOCK_CHAINS.polkadotAssetHub} size={16} />
          <FootnoteText className="text-text-primary">Polkadot Asset Hub</FootnoteText>
        </DetailRow2>
        <DetailRow2 label="Amount">
          <FootnoteText className="text-text-primary">0.01 DOT</FootnoteText>
          <HelpText className="text-text-tertiary">≈ $0.09</HelpText>
        </DetailRow2>
        <DetailRow2 label="Recipient">
          <Identicon address={MOCK_ADDRESSES.eve} size={16} background={false} />
          <FootnoteText className="text-text-primary">14Hkt…jvLm</FootnoteText>
        </DetailRow2>
        <DetailRow2 label="Call hash">
          <CopyableValue value={SAMPLE_CALL_HASH} start={6} end={6} />
        </DetailRow2>
        <DetailRow2 label="Estimated fee">
          <FootnoteText className="text-text-primary">0.0052 DOT</FootnoteText>
          <HelpText className="text-text-tertiary">≈ $0.04</HelpText>
        </DetailRow2>
      </div>
    </div>

    <div className="flex items-start gap-3 rounded-lg border border-icon-warning/20 bg-icon-warning/8 p-4">
      <Icon name="warn" size={16} className="mt-0.5 shrink-0 text-icon-warning" />
      <div className="flex flex-col gap-y-1">
        <FootnoteText className="text-text-primary">This does not sign yet</FootnoteText>
        <HelpText className="text-text-secondary">
          A draft goes into the pending list so co-signers can review before anything is broadcast.
        </HelpText>
      </div>
    </div>
  </Box>
);

// ─── Main component ──────────────────────────────────────────────────────────

const MultisigDraftCreatePrototype = () => {
  const [open, setOpen] = useState(true);
  const [step, setStep] = useState(1);

  const [chainId, setChainId] = useState('polkadot-ah');
  const [callDataMode, setCallDataMode] = useState<'paste' | 'build'>('paste');
  const [callData, setCallData] = useState(SAMPLE_CALL_DATA);

  const [path, setPath] = useState<PathNode[]>([]);

  const [description, setDescription] = useState('');

  const complete = path[path.length - 1]?.kind === 'signer';

  const canContinueStep1 = chainId && callData.trim().length > 0;
  const canContinueStep2 = complete;
  const canCreate = canContinueStep2 && description.trim().length > 0;

  const handleBack = () => {
    if (step === 2 && path.length > 0) {
      setPath(path.slice(0, -1));

      return;
    }
    setStep(step - 1);
  };

  return (
    <div className="flex min-h-[800px] w-full items-center justify-center bg-main-app-background p-10">
      <Modal isOpen={open} size="mdlg" onToggle={setOpen}>
        <Modal.Title close>New draft</Modal.Title>
        <Modal.Content>
          <div className="flex flex-col">
            <StepIndicator step={step} />
            <div className="px-1">
              {step === 1 && (
                <StepTransaction
                  chainId={chainId}
                  setChainId={setChainId}
                  mode={callDataMode}
                  setMode={setCallDataMode}
                  callData={callData}
                  setCallData={setCallData}
                />
              )}
              {step === 2 && <StepPath path={path} setPath={setPath} />}
              {step === 3 && complete && (
                <StepReview path={path} description={description} setDescription={setDescription} />
              )}
            </div>
          </div>
        </Modal.Content>
        <Modal.Footer>
          <div className="flex w-full items-center justify-between">
            <div className="flex items-center gap-2">
              {step > 1 && (
                <Button variant="text" pallet="secondary" size="md" onClick={handleBack}>
                  Back
                </Button>
              )}
            </div>
            <div className="flex items-center gap-4">
              {step === 1 && (
                <Button variant="text" pallet="secondary" size="md" disabled={!chainId} onClick={() => setStep(2)}>
                  Skip
                </Button>
              )}
              {step < 3 && (
                <Button
                  size="md"
                  disabled={step === 1 ? !canContinueStep1 : !canContinueStep2}
                  suffixElement={<Icon name="arrowRight" size={16} />}
                  onClick={() => setStep(step + 1)}
                >
                  Continue
                </Button>
              )}
              {step === 3 && (
                <Button
                  size="md"
                  disabled={!canCreate}
                  prefixElement={<Icon name="checkmark" size={16} />}
                  onClick={() => {
                    setOpen(false);
                    setStep(1);
                  }}
                >
                  Create draft
                </Button>
              )}
            </div>
          </div>
        </Modal.Footer>
      </Modal>

      {!open && (
        <div className="flex flex-col items-center gap-3">
          <IconButton name="add" onClick={() => setOpen(true)} />
          <FootnoteText className="text-text-secondary">Reopen draft wizard</FootnoteText>
        </div>
      )}
    </div>
  );
};

const meta: Meta<typeof MultisigDraftCreatePrototype> = {
  component: MultisigDraftCreatePrototype,
  title: 'Prototypes/MultisigDraftCreate',
  parameters: { layout: 'fullscreen' },
};

export default meta;
type Story = StoryObj<typeof MultisigDraftCreatePrototype>;

export const Default: Story = {};
