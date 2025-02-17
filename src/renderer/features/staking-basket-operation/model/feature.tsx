import { useGate, useUnit } from 'effector-react';

import { type Transaction, TransactionType } from '@/shared/core';
import { createFeature } from '@/shared/feature';
import { useI18n } from '@/shared/i18n';
import { type IconNames } from '@/shared/ui';
import { OperationTitle } from '@/entities/chain';
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
  NominateConfirmation,
  PayeeConfirmation,
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

const getOperationTitle = (transaction: Transaction): string | undefined => {
  const Title: { [key in TransactionType]?: string } = {
    [TransactionType.BOND]: 'operations.titles.startStaking',
    [TransactionType.NOMINATE]: 'operations.titles.nominate',
    [TransactionType.STAKE_MORE]: 'operations.titles.stakeMore',
    [TransactionType.REDEEM]: 'operations.titles.redeem',
    [TransactionType.RESTAKE]: 'operations.titles.restake',
    [TransactionType.DESTINATION]: 'operations.titles.destination',
    [TransactionType.UNSTAKE]: 'operations.titles.unstake',
  };

  return Title[transaction.type];
};

const getModalTitle = (transaction: Transaction): string | undefined => {
  const Title: { [key in TransactionType]?: string } = {
    [TransactionType.BOND]: 'operations.modalTitles.startStakingOn',
    [TransactionType.NOMINATE]: 'operations.modalTitles.nominateOn',
    [TransactionType.STAKE_MORE]: 'operations.modalTitles.stakeMoreOn',
    [TransactionType.REDEEM]: 'operations.modalTitles.redeemOn',
    [TransactionType.RESTAKE]: 'operations.modalTitles.restakeOn',
    [TransactionType.DESTINATION]: 'operations.modalTitles.destinationOn',
    [TransactionType.UNSTAKE]: 'operations.modalTitles.unstakeOn',
  };

  return Title[transaction.type];
};

const getOperationIcon = (transaction: Transaction): IconNames | undefined => {
  const Icon: { [key in TransactionType]?: IconNames } = {
    [TransactionType.BOND]: 'startStakingMst',
    [TransactionType.NOMINATE]: 'changeValidatorsMst',
    [TransactionType.STAKE_MORE]: 'stakeMoreMst',
    [TransactionType.REDEEM]: 'redeemMst',
    [TransactionType.RESTAKE]: 'returnToStakeMst',
    [TransactionType.DESTINATION]: 'destinationMst',
    [TransactionType.UNSTAKE]: 'unstakeMst',
  };

  return Icon[transaction.type];
};

stakingBasketOperationFeature.inject(operationTitleSlot, ({ operation }) => {
  const { t } = useI18n();
  const transaction = basketOperationsService.getCoreTx(operation);

  useGate(validate.gates.flow, { id: operation.id, operation, feeMap: {} });
  const pendingTxs = useUnit(validate.$pendingTxs);

  const title = getOperationTitle(transaction);
  const icon = getOperationIcon(transaction);

  if (title && icon) {
    return (
      <StakingOperationTitle
        title={t(title)}
        icon={icon}
        chainId={transaction.chainId}
        validating={pendingTxs.includes(operation.id)}
        errorText={operation.error?.message}
        error={operation.error}
      />
    );
  }

  return null;
});

stakingBasketOperationFeature.inject(confirmTitleSlot, ({ operation }) => {
  const { t } = useI18n();
  const transaction = basketOperationsService.getCoreTx(operation);

  const title = getModalTitle(transaction);

  if (title) {
    return <OperationTitle className="justify-center" title={t(title)} chainId={operation.coreTx.chainId} />;
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
  if (transaction.type === TransactionType.NOMINATE) return <NominateConfirmation id={operation.id} hideSignButton />;
  if (transaction.type === TransactionType.DESTINATION) return <PayeeConfirmation id={operation.id} hideSignButton />;

  return null;
});

stakingBasketOperationFeature.inject(basketValidate.validationAsyncPipeline, (validOperations) => {
  const invalidTxs = useUnit(validate.$invalidTxs);

  return [...validOperations, ...invalidTxs.keys()];
});
