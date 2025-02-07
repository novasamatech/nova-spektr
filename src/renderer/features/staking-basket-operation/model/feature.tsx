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
  BondExtraConfirmation,
  BondNominateConfirmation,
  RestakeConfirmation,
  UnstakeConfirmation,
  WithdrawConfirmation,
} from '@/features/operations/OperationsConfirm';
import { StakingOperationTitle } from '../components/StakingOperationTitle';

import { confirm } from './confirm';
import { validate } from './validation';

export const stakingBasketOperationFeature = createFeature({
  name: 'staking/basket-operations',
});

stakingBasketOperationFeature.inject(operationTitleSlot, ({ operation }) => {
  const transaction = basketOperationsService.getCoreTx(operation);

  useGate(validate.gates.flow, { id: operation.id, operation, feeMap: {} });
  const pendingTxs = useUnit(validate.$pendingTxs);

  if (
    transaction?.type &&
    [
      TransactionType.BOND,
      TransactionType.STAKE_MORE,
      TransactionType.UNSTAKE,
      TransactionType.RESTAKE,
      TransactionType.REDEEM,
    ].includes(transaction.type)
  ) {
    return (
      <StakingOperationTitle
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

stakingBasketOperationFeature.inject(confirmTitleSlot, ({ operation }) => {
  const { t } = useI18n();
  const chains = useUnit(networkModel.$chains);
  const chain = chains[operation.coreTx.chainId];
  const transaction = basketOperationsService.getCoreTx(operation);

  const { title, params } = getOperationTitle(operation, chain);

  if (
    transaction?.type &&
    [
      TransactionType.BOND,
      TransactionType.STAKE_MORE,
      TransactionType.UNSTAKE,
      TransactionType.RESTAKE,
      TransactionType.REDEEM,
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

stakingBasketOperationFeature.inject(confirmDetailsSlot, ({ operation }) => {
  useGate(confirm.flow, operation);

  const transaction = basketOperationsService.getCoreTx(operation);

  if (transaction.type === TransactionType.BOND) return <BondNominateConfirmation id={operation.id} hideSignButton />;
  if (transaction.type === TransactionType.STAKE_MORE)
    return <BondExtraConfirmation id={operation.id} hideSignButton />;
  if (transaction.type === TransactionType.UNSTAKE) return <UnstakeConfirmation id={operation.id} hideSignButton />;
  if (transaction.type === TransactionType.RESTAKE) return <RestakeConfirmation id={operation.id} hideSignButton />;
  if (transaction.type === TransactionType.REDEEM) return <WithdrawConfirmation id={operation.id} hideSignButton />;

  return null;
});

stakingBasketOperationFeature.inject(basketValidate.validationAsyncPipeline, (validOperations) => {
  const invalidTxs = useUnit(validate.$invalidTxs);

  return [...validOperations, ...invalidTxs.keys()];
});
