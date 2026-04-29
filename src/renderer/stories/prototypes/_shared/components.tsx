import { type ReactNode } from 'react';

import { type Address, type Chain, type WalletType } from '@/shared/core';
import { CaptionText, FootnoteText, Icon, IconButton } from '@/shared/ui';
import { ChainIcon, Identicon, WalletIcon } from '@/shared/ui-entities';
import { Copy, Tooltip } from '@/shared/ui-kit';

import { truncateStr } from './helpers';
import { getChain } from './mock-data';

// ─── StatusPill ──────────────────────────────────────────────────────────────

type StatusPillVariant = 'default' | 'positive' | 'negative' | 'accent';

const pillColors: Record<StatusPillVariant, string> = {
  default: 'border-shade-8 text-text-tertiary',
  positive: 'border-text-positive text-text-positive',
  negative: 'border-text-negative text-text-negative',
  accent: 'border-icon-accent/30 text-icon-accent bg-icon-accent/8',
};

export const StatusPill = ({ label, variant = 'default' }: { label: string; variant?: StatusPillVariant }) => (
  <div className={`flex shrink-0 items-center rounded-[20px] border px-2.5 py-1 ${pillColors[variant]}`}>
    <CaptionText className="uppercase">{label}</CaptionText>
  </div>
);

// ─── AccountIdenticon ────────────────────────────────────────────────────────

export const AccountIdenticon = ({
  address,
  walletType,
  size = 32,
  badgeSize = 14,
}: {
  address: Address;
  walletType?: WalletType;
  size?: number;
  badgeSize?: number;
}) => (
  <div className="relative shrink-0">
    <Identicon address={address} size={size} theme="polkadot" />
    {walletType && (
      <div className="absolute -right-0.5 -bottom-0.5">
        <WalletIcon type={walletType} size={badgeSize} />
      </div>
    )}
  </div>
);

// ─── WalletIconWithBadge ─────────────────────────────────────────────────────

export const WalletIconWithBadge = ({
  type,
  badgeColor,
  size = 20,
}: {
  type: WalletType;
  badgeColor?: string;
  size?: number;
}) => (
  <div className="relative shrink-0">
    <WalletIcon type={type} size={size} />
    {badgeColor && (
      <div className={`absolute top-[13px] -right-px h-2 w-2 rounded-full border border-white ${badgeColor}`} />
    )}
  </div>
);

// ─── CopyableValue ───────────────────────────────────────────────────────────

export const CopyableValue = ({
  value,
  displayValue,
  start = 7,
  end = 8,
}: {
  value: string;
  displayValue?: string;
  start?: number;
  end?: number;
}) => (
  <Copy value={value}>
    <button
      type="button"
      className="group -mr-2 flex cursor-pointer items-center gap-x-1 rounded-sm px-2 py-[3px] hover:bg-action-background-hover"
    >
      <FootnoteText className="truncate text-text-secondary">
        {displayValue ?? truncateStr(value, start, end)}
      </FootnoteText>
      <Icon name="copy" size={16} className="shrink-0 text-icon-default group-hover:text-icon-hover" />
    </button>
  </Copy>
);

// ─── CopyableIconButton ──────────────────────────────────────────────────────

export const CopyableIconButton = ({ value, tooltip }: { value: string; tooltip?: string }) => {
  const button = (
    <Copy value={value}>
      <IconButton name="copy" className="shrink-0 text-icon-default" />
    </Copy>
  );

  if (tooltip) {
    return (
      <Tooltip>
        <Tooltip.Trigger>{button}</Tooltip.Trigger>
        <Tooltip.Content>{tooltip}</Tooltip.Content>
      </Tooltip>
    );
  }

  return button;
};

// ─── CreateNewButton ─────────────────────────────────────────────────────────

export const CreateNewButton = ({ label, onClick }: { label: string; onClick: () => void }) => (
  <button
    type="button"
    className="group w-full cursor-pointer rounded-lg border-2 border-dashed border-shade-12 px-4 py-3.5 transition-all hover:border-icon-accent hover:bg-icon-accent/4 active:scale-[0.998]"
    onClick={onClick}
  >
    <div className="flex items-center gap-3">
      <div className="flex h-7 w-7 items-center justify-center rounded-full border-2 border-dashed border-shade-12 transition-colors group-hover:border-icon-accent group-hover:bg-icon-accent/10">
        <Icon name="add" size={14} className="text-text-tertiary transition-colors group-hover:text-icon-accent" />
      </div>
      <FootnoteText className="font-medium text-text-tertiary transition-colors group-hover:text-icon-accent">
        {label}
      </FootnoteText>
    </div>
  </button>
);

// ─── SectionAccordionHeader ──────────────────────────────────────────────────

export const SectionBadge = ({ count }: { count: number }) => (
  <div className="flex h-5 min-w-[20px] items-center justify-center rounded-full bg-icon-accent/15 px-2">
    <CaptionText className="font-medium text-icon-accent">{count}</CaptionText>
  </div>
);

// ─── InlineChainTitle ────────────────────────────────────────────────────────

export const InlineChainTitle = ({
  chainName,
  chain,
  fontClass,
}: {
  chainName?: string;
  chain?: Chain;
  fontClass?: string;
}) => {
  const resolved = chain ?? getChain(chainName ?? '');

  return (
    <span className="mx-1 inline-flex items-center gap-x-1">
      <ChainIcon chain={resolved} size={16} />
      <span className={fontClass ?? 'text-text-secondary'}>{resolved.name}</span>
    </span>
  );
};

// ─── SignatoryRow ────────────────────────────────────────────────────────────

export const SignatoryRow = ({ icon, children, signed }: { icon: ReactNode; children: ReactNode; signed: boolean }) => (
  <li className="flex items-center justify-between rounded-sm px-2 py-1.5 hover:bg-action-background-hover">
    <div className="flex min-w-0 items-center gap-2">
      {icon}
      {children}
    </div>
    <div
      className={`flex shrink-0 items-center rounded-[20px] border px-2 py-0.5 ${
        signed ? 'border-text-positive text-text-positive' : 'border-shade-8 text-text-tertiary'
      }`}
    >
      <CaptionText className="uppercase">{signed ? 'Signed' : 'Unsigned'}</CaptionText>
    </div>
  </li>
);
