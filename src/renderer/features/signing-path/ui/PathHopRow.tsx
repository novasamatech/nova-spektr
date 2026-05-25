import { type ReactNode } from 'react';

import { CaptionText, FootnoteText, HelpText } from '@/shared/ui';
import { WalletAccountIcon } from '@/shared/ui-entities';

import { type PathNodeView } from './path-views';

type Props = {
  view: PathNodeView;
  index: number;
  isLast: boolean;
  /** Optional trailing content, e.g. a per-hop balance. */
  rightSlot?: ReactNode;
};

/**
 * One numbered hop in a vertical signing-path list: a rail (step number +
 * connector line) plus the hop's label, connection type, icon, name, and
 * subtitle. Shared by PathOverviewBody (popover) and PathBreadcrumb's vertical
 * mode so the hop layout is defined once.
 */
export const PathHopRow = ({ view, index, isLast, rightSlot }: Props) => {
  return (
    <div className="flex gap-3">
      <div className="flex flex-col items-center">
        <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full border border-container-border bg-white">
          <CaptionText className="text-text-secondary">{index + 1}</CaptionText>
        </div>
        {!isLast && <div className="h-8 w-px bg-shade-12" />}
      </div>
      <div className="flex min-w-0 flex-1 flex-col pb-4">
        <CaptionText className="flex min-w-0 items-baseline gap-1 truncate text-text-tertiary">
          <span className="truncate uppercase">{view.label}</span>
          {view.connectionType && (
            <>
              <span className="text-text-tertiary" aria-hidden>
                ·
              </span>
              <span className="truncate text-icon-accent normal-case">{view.connectionType}</span>
            </>
          )}
        </CaptionText>
        <div className="mt-1 flex min-w-0 items-center gap-2">
          {view.formattedAddress && (
            <WalletAccountIcon address={view.formattedAddress} type={view.walletType ?? null} size={22} iconSize={10} />
          )}
          <div className="flex min-w-0 flex-1 flex-col">
            <FootnoteText className="truncate text-text-primary">{view.title}</FootnoteText>
            <HelpText className="truncate text-text-tertiary">{view.subtitle}</HelpText>
          </div>
          {rightSlot}
        </div>
      </div>
    </div>
  );
};
