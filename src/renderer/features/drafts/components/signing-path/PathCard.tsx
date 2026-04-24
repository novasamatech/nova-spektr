import { type KeyboardEvent } from 'react';

import { type WalletType } from '@/shared/core';
import { useI18n } from '@/shared/i18n';
import { cnTw, toAddress } from '@/shared/lib/utils';
import { BodyText, CaptionText, HelpText } from '@/shared/ui';
import { WalletAccountIcon } from '@/shared/ui-entities';

import { type PathCardSize, type PathNodeView } from './path-views';

type Props = {
  view: PathNodeView;
  size?: PathCardSize;
  onClick?: () => void;
  position?: number;
};

export const PathCard = ({ view, size = 'md', onClick, position = 0 }: Props) => {
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
      <CaptionText className="text-text-tertiary uppercase">{view.label}</CaptionText>
      <div className="flex min-w-0 items-center gap-2">
        {view.address && (
          <WalletAccountIcon
            address={toAddress(view.address)}
            type={(view.walletType ?? 'Multisig') as WalletType}
            size={size === 'md' ? 28 : 22}
            iconSize={12}
          />
        )}
        <div className="flex min-w-0 flex-col">
          <BodyText className="truncate text-text-primary">{view.title}</BodyText>
          <HelpText className="truncate text-text-tertiary">{view.subtitle}</HelpText>
        </div>
      </div>
    </div>
  );

  if (onClick) {
    return (
      <button
        type="button"
        // eslint-disable-next-line i18next/no-literal-string
        aria-label={t('operations.drafts.editHop', { step: position + 1, defaultValue: `Edit hop ${position + 1}` })}
        className="flex min-w-0 flex-1"
        onClick={onClick}
        onKeyDown={handleKeyDown}
      >
        {inner}
      </button>
    );
  }

  return inner;
};
