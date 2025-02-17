import { useGate } from 'effector-react';

import { type Transaction, TransactionType } from '@/shared/core';
import { useI18n } from '@/shared/i18n';
import { OperationTitle } from '@/entities/chain';
import { TransactionTitle } from '@/entities/transaction';
import { basketOperationsService } from '@/aggregates/basket-operations';
import {
  basketTransactionConfirmDetailsSlot,
  basketTransactionConfirmTitleSlot,
  validation as basketValidate,
  operationTitleSlot,
} from '@/features/basket-operations';
import {
  AddProxyConfirm,
  AddPureProxiedConfirm,
  RemoveProxyConfirm,
  RemovePureProxiedConfirm,
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
    [TransactionType.ADD_PROXY]: 'operations.titles.addProxy',
    [TransactionType.CREATE_PURE_PROXY]: 'operations.titles.createPureProxy',
    [TransactionType.REMOVE_PROXY]: 'operations.titles.removeProxy',
    [TransactionType.REMOVE_PURE_PROXY]: 'operations.titles.removePureProxy',
  };

  return Title[transaction.type];
};

const getModalTitle = (transaction: Transaction): string | undefined => {
  const Title: { [key in TransactionType]?: string } = {
    [TransactionType.ADD_PROXY]: 'operations.modalTitles.addProxyOn',
    [TransactionType.REMOVE_PROXY]: 'operations.modalTitles.removeProxyOn',
    [TransactionType.CREATE_PURE_PROXY]: 'operations.modalTitles.addPureProxyOn',
    [TransactionType.REMOVE_PURE_PROXY]: 'operations.modalTitles.removePureProxyOn',
  };

  return Title[transaction.type];
};

proxyBasketFeature.inject(operationTitleSlot, ({ transaction }) => {
  const { t } = useI18n();
  const tx = basketOperationsService.getCoreTx(transaction);

  const title = getOperationTitle(tx);

  if (title) {
    return <TransactionTitle className="flex-1 overflow-hidden" title={t(title)} icon="proxyConfirm" />;
  }

  return null;
});

proxyBasketFeature.inject(basketTransactionConfirmTitleSlot, ({ transaction }) => {
  const { t } = useI18n();
  const tx = basketOperationsService.getCoreTx(transaction);
  const title = getModalTitle(tx);

  if (title) {
    return <OperationTitle className="justify-center" title={t(title)} chainId={tx.chainId} />;
  }

  return null;
});

proxyBasketFeature.inject(basketTransactionConfirmDetailsSlot, ({ transaction }) => {
  useGate(confirm.flow, transaction);

  const tx = basketOperationsService.getCoreTx(transaction);

  if (tx.type === TransactionType.ADD_PROXY) return <AddProxyConfirm id={transaction.id} hideSignButton />;
  if (tx.type === TransactionType.REMOVE_PROXY) return <RemoveProxyConfirm id={transaction.id} hideSignButton />;
  if (tx.type === TransactionType.CREATE_PURE_PROXY)
    return <AddPureProxiedConfirm id={transaction.id} hideSignButton />;
  if (tx.type === TransactionType.REMOVE_PURE_PROXY)
    return <RemovePureProxiedConfirm id={transaction.id} hideSignButton />;

  return null;
});

proxyBasketFeature.inject(basketValidate.validationAsyncPipeline, (errors, { transaction }) => {
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
  if (transaction.coreTx.type === TransactionType.REMOVE_PURE_PROXY) {
    return removePureProxiedValidateModel
      .validate({ id: transaction.id, transaction: transaction.coreTx, feeMap: {} })
      .then(({ result }) => {
        return result ? errors.concat(result) : errors;
      });
  }

  return errors;
});
