import { useUnit } from 'effector-react';
import { useEffect, useState } from 'react';
import { toast } from 'sonner';

import { useI18n } from '@/shared/i18n';
import { cnTw } from '@/shared/lib/utils';
import { FootnoteText, Icon, Loader } from '@/shared/ui';
import { ChainTitle } from '@/entities/chain';
import { operationsContextModel } from '../model/context';

export const CHAIN_SYNC_TOAST_ID = 'operations-chain-sync';

/**
 * Compact card: spinner + "Syncing networks… n/total"; hovering expands the
 * per-chain list. Reads `$chainSyncState` itself (rather than taking it as
 * props) so sonner can keep rendering the same component instance across
 * progress ticks without resetting the hover-expanded state.
 */
const ChainSyncToastContent = () => {
  const { t } = useI18n();
  const { expected, fetched } = useUnit(operationsContextModel.$chainSyncState);
  const [isExpanded, setIsExpanded] = useState(false);

  const statusText =
    expected.length === 0
      ? t('operations.sync.connecting')
      : t('operations.sync.syncing', { synced: fetched.length, total: expected.length });

  return (
    <div
      className="w-[356px] rounded-lg border border-divider bg-block-background-default p-4 shadow-card-shadow"
      onMouseEnter={() => setIsExpanded(true)}
      onMouseLeave={() => setIsExpanded(false)}
    >
      <div className="flex items-center gap-x-3">
        <Loader color="primary" size={16} />
        <FootnoteText className="flex-1 text-text-primary">{statusText}</FootnoteText>
        {expected.length > 0 && (
          <Icon
            name="shelfDown"
            size={14}
            className={cnTw('text-icon-default transition-transform', isExpanded ? 'rotate-180' : 'rotate-0')}
          />
        )}
      </div>

      {isExpanded && expected.length > 0 && (
        <ul className="mt-3 flex max-h-[240px] flex-col gap-y-1 overflow-y-auto">
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
    </div>
  );
};

/**
 * Mirrors `$chainSyncState` into one persistent bottom-right toast (sonner is
 * the external system here, hence the effect): shown while any expected chain
 * is still syncing, dismissed on completion and on unmount.
 */
export const useChainSyncToast = () => {
  const { expected, fetched } = useUnit(operationsContextModel.$chainSyncState);
  const isSyncing = expected.length === 0 || fetched.length < expected.length;

  useEffect(() => {
    if (!isSyncing) {
      toast.dismiss(CHAIN_SYNC_TOAST_ID);
      return;
    }

    toast.custom(() => <ChainSyncToastContent />, {
      id: CHAIN_SYNC_TOAST_ID,
      duration: Infinity,
      dismissible: false,
    });
  }, [isSyncing]);

  useEffect(() => {
    return () => {
      toast.dismiss(CHAIN_SYNC_TOAST_ID);
    };
  }, []);
};
