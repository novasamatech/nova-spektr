import { useGate, useUnit } from 'effector-react';

import { type Transaction, TransactionType } from '@/shared/core';
import { createFeature } from '@/shared/feature';
import { useI18n } from '@/shared/i18n';
import { OperationTitle } from '@/entities/chain';
import { basketOperationsService } from '@/aggregates/basket-operations';
import {
  validate as basketValidate,
  confirmDetailsSlot,
  confirmTitleSlot,
  operationTitleSlot,
} from '@/features/basket-operations';
import {
  AddProxyConfirm,
  AddPureProxiedConfirm,
  RemoveProxyConfirm,
  RemovePureProxiedConfirm,
} from '@/features/operations/OperationsConfirm';
import { ProxyOperationTitle } from '../components/ProxyOperationTitle';

import { confirm } from './confirm';
import { validate } from './validation';

export const proxyBasketOperationFeature = createFeature({
  name: 'proxy/basket-operations',
});

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

proxyBasketOperationFeature.inject(operationTitleSlot, ({ operation }) => {
  const { t } = useI18n();
  const transaction = basketOperationsService.getCoreTx(operation);

  useGate(validate.gates.flow, { id: operation.id, operation, feeMap: {} });
  const pendingTxs = useUnit(validate.$pendingTxs);

  const title = getOperationTitle(transaction);

  if (title) {
    return (
      <ProxyOperationTitle
        title={t(title)}
        chainId={transaction.chainId}
        validating={pendingTxs.includes(operation.id)}
        errorText={operation.error?.message}
        error={operation.error}
        operation={operation}
      />
    );
  }

  return null;
});

proxyBasketOperationFeature.inject(confirmTitleSlot, ({ operation }) => {
  const { t } = useI18n();
  const transaction = basketOperationsService.getCoreTx(operation);
  const title = getModalTitle(transaction);

  if (title) {
    return <OperationTitle className="m-3 justify-center" title={t(title)} chainId={operation.coreTx.chainId} />;
  }

  return null;
});

proxyBasketOperationFeature.inject(confirmDetailsSlot, ({ operation }) => {
  useGate(confirm.flow, operation);

  const transaction = basketOperationsService.getCoreTx(operation);

  if (transaction.type === TransactionType.ADD_PROXY) return <AddProxyConfirm id={operation.id} hideSignButton />;
  if (transaction.type === TransactionType.REMOVE_PROXY) return <RemoveProxyConfirm id={operation.id} hideSignButton />;
  if (transaction.type === TransactionType.CREATE_PURE_PROXY)
    return <AddPureProxiedConfirm id={operation.id} hideSignButton />;
  if (transaction.type === TransactionType.REMOVE_PURE_PROXY)
    return <RemovePureProxiedConfirm id={operation.id} hideSignButton />;

  return null;
});

proxyBasketOperationFeature.inject(basketValidate.validationAsyncPipeline, (validOperations) => {
  const invalidTxs = useUnit(validate.$invalidTxs);

  return [...validOperations, ...invalidTxs.keys()];
});
