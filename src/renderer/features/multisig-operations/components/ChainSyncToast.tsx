import { useUnit } from 'effector-react';
import { useEffect, useId, useState } from 'react';
import { toast } from 'sonner';

import { useI18n } from '@/shared/i18n';
import { cnTw } from '@/shared/lib/utils';
import { FootnoteText, Icon, Loader } from '@/shared/ui';
import { ChainTitle } from '@/entities/chain';
import { operationsContextModel } from '../model/context';

export const CHAIN_SYNC_TOAST_ID = 'operations-chain-sync';

/**
 * Compact card: spinner + "Syncing networks… n/total"; hovering (or focusing
 * the header button) reveals the per-chain list. Reads `$chainSyncState` itself
 * (rather than taking it as props) so sonner can keep rendering the same
 * component instance across progress ticks without resetting the expanded
 * state.
 *
 * The card's own box height must stay constant: sonner pins the toast `<li>` to
 * the height it measured on mount (`--initial-height`) while the toaster is
 * hovered, so a card that grows in place just overflows below the viewport.
 * Hence the list renders as an overlay anchored above the card.
 */
export const ChainSyncToastContent = () => {
  const { t } = useI18n();
  const { expected, fetched } = useUnit(operationsContextModel.$chainSyncState);
  const [isExpanded, setIsExpanded] = useState(false);

  const listId = useId();
  const hasChains = expected.length > 0;
  const isListOpen = isExpanded && hasChains;

  const statusText = hasChains
    ? t('operations.sync.syncing', { synced: fetched.length, total: expected.length })
    : t('operations.sync.connecting');

  return (
    <div
      className="relative w-[356px] rounded-lg border border-divider bg-block-background-default p-4 shadow-card-shadow"
      onMouseEnter={() => setIsExpanded(true)}
      onMouseLeave={() => setIsExpanded(false)}
    >
      {isListOpen && (
        <ul
          id={listId}
          className="absolute right-0 bottom-full mb-2 flex max-h-[240px] w-[356px] flex-col gap-y-1 overflow-y-auto rounded-lg border border-divider bg-block-background-default p-3 shadow-card-shadow"
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
      )}

      <button
        type="button"
        className="flex w-full items-center gap-x-3"
        aria-expanded={isListOpen}
        aria-controls={listId}
        onClick={() => setIsExpanded(prev => !prev)}
        onFocus={() => setIsExpanded(true)}
        onBlur={() => setIsExpanded(false)}
      >
        <Loader color="primary" size={16} />
        <FootnoteText className="flex-1 text-start text-text-primary">{statusText}</FootnoteText>
        {hasChains && (
          <Icon
            name="shelfDown"
            size={14}
            className={cnTw('text-icon-default transition-transform', isListOpen ? 'rotate-180' : 'rotate-0')}
          />
        )}
      </button>
    </div>
  );
};

/**
 * Mirrors `$isChainSyncing` into one persistent bottom-right toast (sonner is
 * the external system here, hence the effect): shown while any expected chain
 * is still syncing, dismissed on completion and on unmount. Subscribing to the
 * boolean rather than to `$chainSyncState` keeps the host view out of the
 * per-chain progress re-render loop.
 */
export const useChainSyncToast = () => {
  const isSyncing = useUnit(operationsContextModel.$isChainSyncing);

  useEffect(() => {
    if (!isSyncing) return;

    toast.custom(() => <ChainSyncToastContent />, {
      id: CHAIN_SYNC_TOAST_ID,
      duration: Infinity,
      dismissible: false,
    });

    return () => {
      toast.dismiss(CHAIN_SYNC_TOAST_ID);
    };
  }, [isSyncing]);
};
