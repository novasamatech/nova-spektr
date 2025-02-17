import { useGate } from 'effector-react';

import { type Transaction, TransactionType } from '@/shared/core';
import { useI18n } from '@/shared/i18n';
import { type IconNames } from '@/shared/ui';
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
  BondExtraConfirmation,
  BondNominateConfirmation,
  NominateConfirmation,
  PayeeConfirmation,
  RestakeConfirmation,
  UnstakeConfirmation,
  WithdrawConfirmation,
} from '@/features/operations/OperationsConfirm';
import {
  bondExtraValidateModel,
  bondNominateValidateModel,
  nominateValidateModel,
  payeeValidateModel,
  restakeValidateModel,
  unstakeValidateModel,
  withdrawValidateModel,
} from '@/features/operations/OperationsValidation';

import { confirm } from './model/confirm';
import { stakingBasketFeature } from './model/feature';

export { stakingBasketFeature };

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

stakingBasketFeature.inject(operationTitleSlot, ({ transaction }) => {
  const { t } = useI18n();
  const tx = basketOperationsService.getCoreTx(transaction);

  const title = getOperationTitle(tx);
  const icon = getOperationIcon(tx);

  if (title && icon) {
    return <TransactionTitle className="flex-1 overflow-hidden" title={t(title)} icon={icon} />;
  }

  return null;
});

stakingBasketFeature.inject(basketTransactionConfirmTitleSlot, ({ transaction }) => {
  const { t } = useI18n();
  const tx = basketOperationsService.getCoreTx(transaction);

  const title = getModalTitle(tx);

  if (title) {
    return <OperationTitle className="justify-center" title={t(title)} chainId={tx.chainId} />;
  }

  return null;
});

stakingBasketFeature.inject(basketTransactionConfirmDetailsSlot, ({ transaction }) => {
  useGate(confirm.flow, transaction);

  const tx = basketOperationsService.getCoreTx(transaction);

  if (tx.type === TransactionType.BOND) return <BondNominateConfirmation id={transaction.id} hideSignButton />;
  if (tx.type === TransactionType.STAKE_MORE) return <BondExtraConfirmation id={transaction.id} hideSignButton />;
  if (tx.type === TransactionType.UNSTAKE) return <UnstakeConfirmation id={transaction.id} hideSignButton />;
  if (tx.type === TransactionType.RESTAKE) return <RestakeConfirmation id={transaction.id} hideSignButton />;
  if (tx.type === TransactionType.REDEEM) return <WithdrawConfirmation id={transaction.id} hideSignButton />;
  if (tx.type === TransactionType.NOMINATE) return <NominateConfirmation id={transaction.id} hideSignButton />;
  if (tx.type === TransactionType.DESTINATION) return <PayeeConfirmation id={transaction.id} hideSignButton />;

  return null;
});

stakingBasketFeature.inject(basketValidate.validationAsyncPipeline, (errors, { transaction }) => {
  if (transaction.coreTx.type === TransactionType.BOND) {
    return bondNominateValidateModel
      .validate({ id: transaction.id, transaction: transaction.coreTx, feeMap: {} })
      .then(({ result }) => {
        return result ? errors.concat(result) : errors;
      });
  }
  if (transaction.coreTx.type === TransactionType.STAKE_MORE) {
    return bondExtraValidateModel
      .validate({ id: transaction.id, transaction: transaction.coreTx, feeMap: {} })
      .then(({ result }) => {
        return result ? errors.concat(result) : errors;
      });
  }
  if (transaction.coreTx.type === TransactionType.UNSTAKE) {
    return unstakeValidateModel
      .validate({ id: transaction.id, transaction: transaction.coreTx, feeMap: {} })
      .then(({ result }) => {
        return result ? errors.concat(result) : errors;
      });
  }
  if (transaction.coreTx.type === TransactionType.RESTAKE) {
    return restakeValidateModel
      .validate({ id: transaction.id, transaction: transaction.coreTx, feeMap: {} })
      .then(({ result }) => {
        return result ? errors.concat(result) : errors;
      });
  }
  if (transaction.coreTx.type === TransactionType.REDEEM) {
    return withdrawValidateModel
      .validate({ id: transaction.id, transaction: transaction.coreTx, feeMap: {} })
      .then(({ result }) => {
        return result ? errors.concat(result) : errors;
      });
  }
  if (transaction.coreTx.type === TransactionType.NOMINATE) {
    return nominateValidateModel
      .validate({ id: transaction.id, transaction: transaction.coreTx, feeMap: {} })
      .then(({ result }) => {
        return result ? errors.concat(result) : errors;
      });
  }

  // TODO implement
  if (transaction.coreTx.type === TransactionType.DESTINATION) {
    return payeeValidateModel
      .validate({ id: transaction.id, transaction: transaction.coreTx, feeMap: {} })
      .then(({ result }) => {
        return result ? errors.concat(result) : errors;
      });
  }

  return errors;
});
