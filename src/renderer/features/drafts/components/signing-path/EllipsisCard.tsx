import { type WalletType } from '@/shared/core';
import { cnTw, toAddress } from '@/shared/lib/utils';
import { CaptionText, FootnoteText, HelpText } from '@/shared/ui';
import { WalletAccountIcon } from '@/shared/ui-entities';
import { Popover } from '@/shared/ui-kit';

import { type PathCardSize, type PathNodeView } from './path-views';

type Props = {
  hiddenViews: PathNodeView[];
  size?: PathCardSize;
};

export const EllipsisCard = ({ hiddenViews, size = 'sm' }: Props) => {
  const ariaLabel = `Collapsed: ${hiddenViews.map((v) => v.title).join(', ')}`;

  return (
    <Popover>
      <Popover.Trigger>
        <button
          type="button"
          aria-label={ariaLabel}
          className={cnTw(
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
          {/* eslint-disable-next-line i18next/no-literal-string */}
          <CaptionText className="text-text-tertiary uppercase">Full path</CaptionText>
          <div className="flex flex-col gap-y-2">
            {hiddenViews.map((v, i) => (
              <div key={`${v.label}-${i}`} className="flex items-center gap-2.5">
                {v.address && (
                  <WalletAccountIcon
                    address={toAddress(v.address)}
                    type={(v.walletType ?? 'Multisig') as WalletType}
                    size={24}
                    iconSize={10}
                  />
                )}
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
};
