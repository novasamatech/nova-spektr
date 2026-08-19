import { useUnit } from 'effector-react';
import { useMemo } from 'react';

import { useI18n } from '@/shared/i18n';
import { BodyText, FootnoteText, SmallTitleText } from '@/shared/ui';
import { draftsResource } from '@/domains/backend';
import { accounts, multisigOperation } from '@/domains/network';
import { networkModel } from '@/entities/network';
import { useVisibleDrafts } from '@/features/drafts';
import { DashboardWidget } from '@/pages/Dashboard';
import { filterAwaitingSignature, filterScopedDrafts } from '../model/queue-model';

import { AwaitingSignatureSubsection } from './AwaitingSignatureSubsection';
import { DraftsSubsection } from './DraftsSubsection';

type Props = {
  accountIds: string[];
};

export const OperationsQueueWidget = ({ accountIds }: Props) => {
  const { t } = useI18n();

  const allOperations = useUnit(multisigOperation.$list);
  const walletAccounts = useUnit(accounts.$list);
  const chains = useUnit(networkModel.$chains);

  const draftsLoaded = useUnit(draftsResource.$loaded);
  const { drafts, available: draftsAvailable } = useVisibleDrafts();

  const selectedSet = useMemo(() => new Set(accountIds), [accountIds]);

  const scopedDrafts = useMemo(() => {
    if (!draftsAvailable) return [];

    return filterScopedDrafts(drafts, selectedSet);
  }, [drafts, selectedSet, draftsAvailable]);

  const awaiting = useMemo(
    () => filterAwaitingSignature(allOperations, walletAccounts, selectedSet, chains),
    [allOperations, walletAccounts, selectedSet, chains],
  );

  if (accountIds.length === 0) {
    return (
      <DashboardWidget>
        <FootnoteText className="text-text-tertiary">{t('dashboard.operationsQueue.title')}</FootnoteText>
        <div className="flex flex-col items-center gap-y-1 py-6">
          <SmallTitleText className="text-text-tertiary">{t('dashboard.noSelection.title')}</SmallTitleText>
          <BodyText className="text-text-tertiary">{t('dashboard.noSelection.description')}</BodyText>
        </div>
      </DashboardWidget>
    );
  }

  const isLoading = draftsAvailable && !draftsLoaded;
  const isEmpty = !isLoading && scopedDrafts.length === 0 && awaiting.length === 0;

  return (
    <DashboardWidget>
      <FootnoteText className="text-text-tertiary">{t('dashboard.operationsQueue.title')}</FootnoteText>

      <div className="mt-3 flex max-h-[420px] flex-col gap-y-4 overflow-y-auto pr-1">
        {scopedDrafts.length > 0 && <DraftsSubsection drafts={scopedDrafts} />}
        {awaiting.length > 0 && <AwaitingSignatureSubsection operations={awaiting} />}
        {isEmpty && (
          <div className="flex flex-col items-center py-6">
            <BodyText className="text-text-tertiary">{t('dashboard.operationsQueue.empty')}</BodyText>
          </div>
        )}
      </div>
    </DashboardWidget>
  );
};
