import { useUnit } from 'effector-react';
import { useEffect, useId, useState } from 'react';
import { toast } from 'sonner';

import { useI18n } from '@/shared/i18n';
import { cnTw } from '@/shared/lib/utils';
import { FootnoteText, Icon, IconButton, Loader } from '@/shared/ui';
import { TOAST_WIDTH } from '@/shared/ui-kit';
import { ChainTitle } from '@/entities/chain';
import { operationsContextModel } from '../model/context';

export const CHAIN_SYNC_TOAST_ID = 'operations-chain-sync';

// The per-chain overlay scrolls past this height rather than growing above the viewport.
const CHAIN_LIST_MAX_HEIGHT = 240;

/**
 * Compact card: spinner + "Syncing networks… n/total" + a close button;
 * hovering (or focusing the header button) reveals the per-chain list. Reads
 * `$chainSyncState` itself (rather than taking it as props) so sonner can keep
 * rendering the same component instance across progress ticks without resetting
 * the expanded state.
 *
 * The card's own box height must stay constant: sonner pins the toast `<li>` to
 * the height it measured on mount (`--initial-height`) while the toaster is
 * hovered, so a card that grows in place just overflows below the viewport.
 * Hence the list renders as an overlay anchored above the card.
 *
 * The close button is ours: sonner draws no close control for `toast.custom`
 * cards, and routing the close through `syncToastDismissed` is what lets the
 * model remember it (see `$isSyncToastDismissed`).
 */
export const ChainSyncToastContent = () => {
  const { t } = useI18n();
  const { expected, fetched } = useUnit(operationsContextModel.$chainSyncState);
  const [isHovered, setIsHovered] = useState(false);
  const [isPinned, setIsPinned] = useState(false);

  const listId = useId();
  const hasChains = expected.length > 0;
  const isListOpen = hasChains && (isHovered || isPinned);

  const statusText = hasChains
    ? t('operations.sync.syncing', { synced: fetched.length, total: expected.length })
    : t('operations.sync.connecting');

  const header = (
    <>
      <Loader color="primary" size={16} />
      <FootnoteText className="flex-1 text-start text-text-primary">{statusText}</FootnoteText>
      {hasChains && (
        <Icon
          name="shelfDown"
          size={14}
          className={cnTw('text-icon-default transition-transform', isListOpen ? 'rotate-180' : 'rotate-0')}
        />
      )}
    </>
  );

  return (
    <div
      className="relative rounded-lg border border-divider bg-block-background-default p-4 shadow-card-shadow"
      style={{ width: TOAST_WIDTH }}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      {isListOpen && (
        <div className="absolute right-0 bottom-full pb-2" style={{ width: TOAST_WIDTH }}>
          <ul
            id={listId}
            className="flex w-full flex-col gap-y-1 overflow-y-auto rounded-lg border border-divider bg-block-background-default p-3 shadow-card-shadow"
            style={{ maxHeight: CHAIN_LIST_MAX_HEIGHT }}
          >
            {expected.map(chainId => {
              const isFetched = fetched.includes(chainId);

              return (
                <li key={chainId} className="flex items-center justify-between gap-x-2 py-1">
                  <ChainTitle chainId={chainId} fontClass="text-text-primary" />
                  <div className="flex items-center gap-x-1.5">
                    {isFetched ? (
                      <>
                        <Icon name="checkmarkOutline" size={14} className="text-icon-positive" />
                        <FootnoteText className="text-text-positive">{t('operations.sync.synced')}</FootnoteText>
                      </>
                    ) : (
                      <FootnoteText className="text-text-tertiary">{t('operations.sync.loading')}</FootnoteText>
                    )}
                  </div>
                </li>
              );
            })}
          </ul>
        </div>
      )}

      <div className="flex items-center gap-x-3">
        {hasChains ? (
          <button
            type="button"
            className="flex min-w-0 flex-1 items-center gap-x-3"
            aria-expanded={isListOpen}
            aria-controls={isListOpen ? listId : undefined}
            onClick={() => setIsPinned(prev => !prev)}
            onFocus={() => setIsHovered(true)}
            onBlur={() => setIsHovered(false)}
          >
            {header}
          </button>
        ) : (
          <div className="flex min-w-0 flex-1 items-center gap-x-3">{header}</div>
        )}
        <IconButton
          name="closeOutline"
          size={16}
          ariaLabel={t('general.button.closeButton')}
          onClick={() => operationsContextModel.syncToastDismissed()}
        />
      </div>
    </div>
  );
};

/**
 * Mirrors `$isSyncToastVisible` into one persistent bottom-right toast (sonner
 * is the external system here, hence the effect): shown while any expected
 * chain is still syncing and the user hasn't closed it, dismissed on
 * completion, on close and on unmount. Subscribing to the boolean rather than
 * to `$chainSyncState` keeps the host view out of the per-chain progress
 * re-render loop.
 *
 * Closing goes through the card's own button only (`dismissible: false` turns
 * sonner's swipe off): the model remembers the close for the current sync
 * cycle, so an offline session (APIs never connect, `expected` stays empty)
 * isn't shown the same toast again on every visit to the page.
 */
export const useChainSyncToast = () => {
  const isVisible = useUnit(operationsContextModel.$isSyncToastVisible);

  useEffect(() => {
    if (!isVisible) return;

    toast.custom(() => <ChainSyncToastContent />, {
      id: CHAIN_SYNC_TOAST_ID,
      duration: Infinity,
      dismissible: false,
    });

    return () => {
      toast.dismiss(CHAIN_SYNC_TOAST_ID);
    };
  }, [isVisible]);
};
