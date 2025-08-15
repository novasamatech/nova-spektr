import { useGate } from 'effector-react';
import { t } from 'i18next';

import { type Transaction, TransactionType } from '@/shared/core';
import { useI18n } from '@/shared/i18n';
import { ChainTitle, OperationTitle } from '@/entities/chain';
import { TransactionTitle } from '@/entities/transaction';
import { basketOperationsService } from '@/aggregates/basket-operations';
import { basketSDK } from '@/sdk/basket';
import {
  AddProxyConfirmation,
  AddPureProxiedConfirmation,
  RemoveProxyConfirmation,
} from '@/features/operations/OperationsConfirm';
import {
  addProxyValidateModel,
  addPureProxiedValidateModel,
  removeProxyValidateModel,
  removePureProxiedValidateModel,
} from '@/features/operations/OperationsValidation';

import { confirm } from './model/confirm';
import { proxyBasketFeature } from './model/feature';

export { proxyBasketFeature };

const getOperationTitle = (transaction: Transaction): string | undefined => {
  const Title: { [key in TransactionType]?: string } = {
    [TransactionType.ADD_PROXY]: t('operations.titles.addProxy'),
    [TransactionType.CREATE_PURE_PROXY]: t('operations.titles.createPureProxy'),
    [TransactionType.REMOVE_PROXY]: t('operations.titles.removeProxy'),
    [TransactionType.KILL_PURE_PROXY]: t('operations.titles.removePureProxy'),
  };

  return Title[transaction.type];
};

const getModalTitle = (transaction: Transaction): string | undefined => {
  const Title: { [key in TransactionType]?: string } = {
    [TransactionType.ADD_PROXY]: t('operations.modalTitles.addProxyOn'),
    [TransactionType.REMOVE_PROXY]: t('operations.modalTitles.removeProxyOn'),
    [TransactionType.CREATE_PURE_PROXY]: t('operations.modalTitles.addPureProxyOn'),
    [TransactionType.KILL_PURE_PROXY]: t('operations.modalTitles.removePureProxyOn'),
  };

  return Title[transaction.type];
};

basketSDK(proxyBasketFeature, {
  operationTitle({ transaction }) {
    const { t } = useI18n();
    const tx = basketOperationsService.getCoreTx(transaction);

    const title = getOperationTitle(tx);

    if (title) {
      return (
        <>
          <TransactionTitle className="flex-1 overflow-hidden" title={t(title)} icon="proxyConfirm" />
          <ChainTitle chainId={transaction.coreTx.chainId} />
        </>
      );
    }

    return null;
  },
  transactionConfirmTitle({ transaction }) {
    const { t } = useI18n();
    const tx = basketOperationsService.getCoreTx(transaction);
    const title = getModalTitle(tx);

    if (title) {
      return <OperationTitle className="justify-center" title={t(title)} chainId={tx.chainId} />;
    }

    return null;
  },
  transactionConfirmDetails({ transaction }) {
    useGate(confirm.flow, transaction);

    const tx = basketOperationsService.getCoreTx(transaction);

    if (tx.type === TransactionType.ADD_PROXY) return <AddProxyConfirmation id={transaction.id} hideSignButton />;
    if (tx.type === TransactionType.REMOVE_PROXY) return <RemoveProxyConfirmation id={transaction.id} hideSignButton />;
    if (tx.type === TransactionType.CREATE_PURE_PROXY)
      return <AddPureProxiedConfirmation id={transaction.id} hideSignButton />;
    if (tx.type === TransactionType.KILL_PURE_PROXY)
      return <RemoveProxyConfirmation id={transaction.id} hideSignButton />;

    return null;
  },
  validation(errors, { transaction }) {
    if (transaction.coreTx.type === TransactionType.ADD_PROXY) {
      return addProxyValidateModel
        .validate({ id: transaction.id, transaction: transaction.coreTx, feeMap: {} })
        .then(({ result }) => {
          return result ? errors.concat(result) : errors;
        });
    }
    if (transaction.coreTx.type === TransactionType.REMOVE_PROXY) {
      return removeProxyValidateModel
        .validate({ id: transaction.id, transaction: transaction.coreTx, feeMap: {} })
        .then(({ result }) => {
          return result ? errors.concat(result) : errors;
        });
    }
    if (transaction.coreTx.type === TransactionType.CREATE_PURE_PROXY) {
      return addPureProxiedValidateModel
        .validate({ id: transaction.id, transaction: transaction.coreTx, feeMap: {} })
        .then(({ result }) => {
          return result ? errors.concat(result) : errors;
        });
    }
    if (transaction.coreTx.type === TransactionType.KILL_PURE_PROXY) {
      return removePureProxiedValidateModel
        .validate({ id: transaction.id, transaction: transaction.coreTx, feeMap: {} })
        .then(({ result }) => {
          return result ? errors.concat(result) : errors;
        });
    }

    return errors;
  },
});
