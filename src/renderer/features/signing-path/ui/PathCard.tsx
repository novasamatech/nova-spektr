import { type BN } from '@polkadot/util';
import { type KeyboardEvent, type ReactNode } from 'react';

import { type Asset } from '@/shared/core';
import { useI18n } from '@/shared/i18n';
import { cnTw, toAddress } from '@/shared/lib/utils';
import { BodyText, CaptionText, HelpText } from '@/shared/ui';
import { WalletAccountIcon } from '@/shared/ui-entities';
import { AssetBalance } from '@/shared/ui-entities/AssetBalance/AssetBalance';

import { type PathCardSize, type PathNodeView } from './path-views';

type Props = {
  view: PathNodeView;
  size?: PathCardSize;
  onClick?: () => void;
  position?: number;
  /**
   * Optional balance line shown below the address — rendered when the card
   * surfaces an account whose balance is meaningful for the operation (e.g. the
   * signer's transferable balance in the transfer flow).
   */
  balance?: { value: BN | string; asset: Asset };
  /**
   * Render the card with a red border to indicate validation failure on this
   * hop (e.g. the signer can't cover fee + multisig deposit).
   */
  hasError?: boolean;
  rightSlot?: ReactNode;
};

export const PathCard = ({ view, size = 'md', onClick, position = 0, balance, hasError, rightSlot }: Props) => {
  const { t } = useI18n();

  const handleKeyDown = (e: KeyboardEvent<HTMLButtonElement>) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      onClick?.();
    }
  };

  const inner = (
    <div
      className={cnTw(
        'flex min-w-0 flex-1 flex-col rounded-lg border border-container-border bg-white',
        size === 'md' ? 'gap-y-2.5 p-4' : 'gap-y-1.5 px-3.5 py-2.5',
        onClick && 'cursor-pointer transition-colors hover:bg-action-background-hover',
      )}
    >
      <CaptionText className="flex min-w-0 items-baseline gap-1 truncate text-text-tertiary">
        <span className="truncate uppercase">{view.label}</span>
        {view.connectionType && (
          <>
            <span aria-hidden>·</span>
            <span className="truncate text-icon-accent normal-case">{view.connectionType}</span>
          </>
        )}
      </CaptionText>
      <div className="flex min-w-0 items-center gap-2">
        {view.address && (
          <WalletAccountIcon
            address={toAddress(view.address)}
            type={view.walletType ?? null}
            size={size === 'md' ? 28 : 22}
            iconSize={12}
          />
        )}
        <div className="flex min-w-0 flex-1 flex-col">
          <BodyText className="truncate text-text-primary">{view.title}</BodyText>
          <HelpText className="truncate text-text-tertiary">{view.subtitle}</HelpText>
        </div>
        {balance && (
          <AssetBalance
            value={balance.value}
            asset={balance.asset}
            className={cnTw('text-footnote', hasError ? 'text-text-negative' : 'text-text-secondary')}
          />
        )}
        {rightSlot}
      </div>
    </div>
  );

  if (onClick) {
    return (
      <button
        type="button"
        aria-label={t('operations.drafts.editHop', { step: position + 1 })}
        className="flex min-w-0 flex-1 text-left"
        onClick={onClick}
        onKeyDown={handleKeyDown}
      >
        {inner}
      </button>
    );
  }

  // Match the clickable branch's flex shell so widths stay equal across cards.
  return <div className="flex min-w-0 flex-1">{inner}</div>;
};
