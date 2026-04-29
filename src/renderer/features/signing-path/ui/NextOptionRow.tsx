import { type ReactNode } from 'react';

import { WalletType } from '@/shared/core';
import { cnTw, toAddress, toShortAddress } from '@/shared/lib/utils';
import { BodyText, HelpText } from '@/shared/ui';
import { WalletAccountIcon } from '@/shared/ui-entities';
import { type PathNextOption } from '../model/graph-model';

type NextOptionRowProps = {
  option: PathNextOption;
  selected: boolean;
  onClick: () => void;
  trailing?: ReactNode;
};

export const NextOptionRow = ({ option, selected, onClick, trailing }: NextOptionRowProps) => {
  const address = toAddress(option.accountId);

  const subtitle =
    option.kind === 'multisig'
      ? option.threshold !== undefined && option.signatoriesCount !== undefined
        ? `${option.threshold} of ${option.signatoriesCount}`
        : 'Multisig'
      : toShortAddress(address, 8);

  const walletType = option.kind === 'multisig' ? WalletType.MULTISIG : null;

  const proxyType = option.kind === 'multisig' ? option.proxyType : undefined;

  return (
    <button
      type="button"
      aria-pressed={selected}
      className={cnTw(
        'flex w-full cursor-pointer items-center gap-3 rounded-lg border px-3.5 py-3 text-left transition-all',
        selected
          ? 'border-icon-accent bg-icon-accent/6 shadow-card-shadow'
          : 'border-container-border bg-white hover:border-icon-accent/40 hover:bg-action-background-hover',
      )}
      onClick={onClick}
    >
      <WalletAccountIcon address={address} type={walletType} size={32} iconSize={12} />
      <div className="flex min-w-0 flex-1 flex-col">
        <BodyText className="truncate text-text-primary">{option.name}</BodyText>
        <HelpText className="truncate text-text-tertiary">{subtitle}</HelpText>
      </div>
      {proxyType && (
        <span className="shrink-0 rounded-full border border-icon-accent/30 bg-icon-accent/8 px-2 py-0.5 text-help-text text-icon-accent">
          {proxyType}
        </span>
      )}
      {trailing}
      <div
        className={cnTw(
          'flex h-5 w-5 items-center justify-center rounded-full border-2 transition-colors',
          selected ? 'border-icon-accent bg-icon-accent' : 'border-shade-12',
        )}
      >
        {selected && <div className="h-1.5 w-1.5 rounded-full bg-white" />}
      </div>
    </button>
  );
};
