import { useUnit } from 'effector-react';
import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';

import { useI18n } from '@/shared/i18n';
import { cnTw } from '@/shared/lib/utils';
import { Paths } from '@/shared/routes';
import { BodyText, FootnoteText, Icon, SmallTitleText } from '@/shared/ui';
import { useNotification } from '@/shared/ui-kit';
import { operationDescriptionsResource } from '@/domains/backend';
import { accounts, multisigOperation } from '@/domains/network';
import { networkModel } from '@/entities/network';
import { filterVisibleDrafts, useReadableDrafts, useSubmitDraft } from '@/features/drafts';
import { ChainSyncStatus } from '@/features/multisig-operations';
import { DashboardWidget } from '@/pages/Dashboard';
import {
  type QueueTab,
  buildQueueItems,
  countQueue,
  filterAwaitingSignature,
  filterQueueBySkip,
  filterQueueByTab,
  filterScopedDrafts,
} from '../model/queue-model';
import { skipModel } from '../model/skip-model';

import { QueueCarousel } from './QueueCarousel';

type Props = {
  accountIds: string[];
};

export const OperationsQueueWidget = ({ accountIds }: Props) => {
  const { t } = useI18n();
  const { toast } = useNotification();
  const navigate = useNavigate();
  const { submitDraft, modal: submitDraftModalNode } = useSubmitDraft();

  const linkedDraftIds = useUnit(operationDescriptionsResource.$linkedDraftIds);
  const operationsLoaded = useUnit(operationDescriptionsResource.$operationsLoaded);
  const allOperations = useUnit(multisigOperation.$list);
  const walletAccounts = useUnit(accounts.$list);
  const chains = useUnit(networkModel.$chains);
  const skipped = useUnit(skipModel.$skipped);

  const { drafts, available: draftsAvailable } = useReadableDrafts();

  const [tab, setTab] = useState<QueueTab>('multisig');

  const selectedSet = useMemo(() => new Set(accountIds), [accountIds]);
  const skippedSet = useMemo(() => new Set(skipped), [skipped]);

  const scopedDrafts = useMemo(() => {
    if (!draftsAvailable) return [];

    return filterScopedDrafts(filterVisibleDrafts(drafts, linkedDraftIds, operationsLoaded), selectedSet);
  }, [drafts, linkedDraftIds, operationsLoaded, selectedSet, draftsAvailable]);

  const awaiting = useMemo(
    () => filterAwaitingSignature(allOperations, walletAccounts, selectedSet, chains),
    [allOperations, walletAccounts, selectedSet, chains],
  );

  const visibleItems = useMemo(
    () => filterQueueBySkip(buildQueueItems(scopedDrafts, awaiting), skippedSet),
    [scopedDrafts, awaiting, skippedSet],
  );

  const counts = useMemo(() => countQueue(visibleItems), [visibleItems]);
  const tabItems = useMemo(() => filterQueueByTab(visibleItems, tab), [visibleItems, tab]);

  const handleSkip = (key: string) => {
    skipModel.skip(key);
    toast.success(t('dashboard.operationsQueue.skipped'), {
      action: {
        label: t('dashboard.operationsQueue.undo'),
        onClick: () => skipModel.unskip(key),
      },
    });
  };

  const toggleTab = (next: QueueTab) => setTab((current) => (current === next ? 'all' : next));

  if (accountIds.length === 0) {
    return (
      <DashboardWidget colSpan={2}>
        <FootnoteText className="text-text-tertiary">{t('dashboard.operationsQueue.title')}</FootnoteText>
        <div className="flex flex-col items-center gap-y-1 py-6">
          <SmallTitleText className="text-text-tertiary">{t('dashboard.noSelection.title')}</SmallTitleText>
          <BodyText className="text-text-tertiary">{t('dashboard.noSelection.description')}</BodyText>
        </div>
      </DashboardWidget>
    );
  }

  const isLoading = !operationsLoaded;
  const isEmpty = !isLoading && tabItems.length === 0;

  return (
    <DashboardWidget colSpan={2}>
      <div className="flex items-center justify-between gap-x-2">
        <div className="flex items-center gap-x-2">
          {draftsAvailable && (
            <button
              type="button"
              className={cnTw(
                'flex cursor-pointer items-center gap-x-1 rounded-md px-2 py-1 text-footnote transition-colors',
                tab === 'drafts'
                  ? 'bg-icon-accent/15 text-icon-accent'
                  : 'text-text-secondary hover:bg-action-background-hover',
              )}
              onClick={() => toggleTab('drafts')}
            >
              <span className="font-semibold">{counts.drafts}</span>
              {t('dashboard.operationsQueue.toSubmit')}
            </button>
          )}
          <button
            type="button"
            className={cnTw(
              'flex cursor-pointer items-center gap-x-1 rounded-md px-2 py-1 text-footnote transition-colors',
              tab === 'multisig'
                ? 'bg-text-negative/15 text-text-negative'
                : 'text-text-secondary hover:bg-action-background-hover',
            )}
            onClick={() => toggleTab('multisig')}
          >
            <span className="font-semibold">{counts.multisig}</span>
            {t('dashboard.operationsQueue.toApprove')}
          </button>
        </div>

        <button
          type="button"
          className="flex cursor-pointer items-center gap-x-0.5 text-help-text text-text-tertiary hover:text-text-secondary"
          onClick={() => navigate(Paths.OPERATIONS)}
        >
          {t('dashboard.operationsQueue.viewAll')}
          <Icon name="arrowRight" size={12} />
        </button>
      </div>

      <div className="mt-3">
        {tabItems.length > 0 && (
          <QueueCarousel items={tabItems} showDots={!isLoading} onSkip={handleSkip} onSubmitDraft={submitDraft} />
        )}

        {isLoading && (
          <div className="mt-2 flex items-center justify-center py-2">
            <ChainSyncStatus />
          </div>
        )}

        {isEmpty && (
          <div className="flex flex-col items-center py-6">
            <BodyText className="text-text-tertiary">{t('dashboard.operationsQueue.empty')}</BodyText>
          </div>
        )}
      </div>

      {submitDraftModalNode}
    </DashboardWidget>
  );
};
