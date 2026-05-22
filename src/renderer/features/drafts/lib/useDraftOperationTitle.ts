import { useUnit } from 'effector-react';

import { useTransformer } from '@/shared/di';
import { useI18n } from '@/shared/i18n';
import { formatSectionAndMethod } from '@/shared/lib/utils';
import { type Draft } from '@/domains/backend';
import { networkModel } from '@/entities/network';
import { findCoreTransaction, useTransactionAsset } from '@/entities/transaction';
import { operationTitleTransformer } from '@/features/multisig-operations';

import { useDecodedDraftTransaction } from './useDecodedDraftTransaction';

export const useDraftOperationTitle = (draft: Draft): string | null => {
  const { t } = useI18n();
  const chains = useUnit(networkModel.$chains);
  const decodedTransaction = useDecodedDraftTransaction(draft);

  const coreTx = findCoreTransaction(decodedTransaction);
  const asset = useTransactionAsset(coreTx, draft.chainId);
  const externalTitle = useTransformer(operationTitleTransformer, {
    operation: decodedTransaction ? { transaction: decodedTransaction, chainId: draft.chainId } : null,
    chains,
    asset,
    t,
  });

  if (externalTitle?.title) return externalTitle.title;
  if (!coreTx) return null;

  return formatSectionAndMethod(coreTx.section, coreTx.method);
};
