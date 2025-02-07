import { useGate, useUnit } from 'effector-react';

import { TransactionType } from '@/shared/core';
import { createFeature } from '@/shared/feature';
import { useI18n } from '@/shared/i18n';
import { OperationTitle, getOperationTitle } from '@/entities/chain';
import { networkModel } from '@/entities/network';
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

proxyBasketOperationFeature.inject(operationTitleSlot, ({ operation }) => {
  const transaction = basketOperationsService.getCoreTx(operation);

  useGate(validate.gates.flow, { id: operation.id, operation, feeMap: {} });
  const pendingTxs = useUnit(validate.$pendingTxs);

  if (
    transaction?.type &&
    [
      TransactionType.ADD_PROXY,
      TransactionType.REMOVE_PROXY,
      TransactionType.CREATE_PURE_PROXY,
      TransactionType.REMOVE_PURE_PROXY,
    ].includes(transaction.type)
  ) {
    return (
      <ProxyOperationTitle
        coreTx={transaction}
        validating={pendingTxs.includes(operation.id)}
        errorText={operation.error?.message}
        error={operation.error}
        onClick={() => {}}
        onTxRemoved={() => {}}
      />
    );
  }

  return null;
});

proxyBasketOperationFeature.inject(confirmTitleSlot, ({ operation }) => {
  const { t } = useI18n();
  const chains = useUnit(networkModel.$chains);
  const chain = chains[operation.coreTx.chainId];
  const transaction = basketOperationsService.getCoreTx(operation);

  const { title, params } = getOperationTitle(operation, chain);

  if (
    transaction?.type &&
    [
      TransactionType.ADD_PROXY,
      TransactionType.REMOVE_PROXY,
      TransactionType.CREATE_PURE_PROXY,
      TransactionType.REMOVE_PURE_PROXY,
    ].includes(transaction.type)
  ) {
    return (
      <OperationTitle
        className="m-3 justify-center"
        title={`${t(title, { ...params })}`}
        chainId={operation.coreTx.chainId}
      />
    );
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
