import { useUnit } from 'effector-react';
import { ReactNode } from 'react';

import { BaseModal } from '@shared/ui';
import { useModalClose } from '@shared/lib/hooks';
import { OperationTitle } from '@entities/chain';
import { useI18n } from '@app/providers';
import { TransactionType, type BasketTransaction } from '@shared/core';
import { OperationSign, OperationSubmit } from '@features/operations';
import { signOperationsUtils } from '../lib/sign-operations-utils';
import { signOperationsModel } from '../model/sign-operations-model';
import {
  AddProxyConfirm,
  AddPureProxiedConfirm,
  BondExtraConfirmation,
  BondNominateConfirmation,
  NominateConfirmation,
  PayeeConfirmation,
  RemoveProxyConfirm,
  RemovePureProxiedConfirm,
  RestakeConfirmation,
  TransferConfirm,
  UnstakeConfirmation,
  WithdrawConfirmation,
} from '@features/operations/OperationsConfirm';
import { getOperationTitle } from '../lib/operation-title';
import { TransferTypes, XcmTypes } from '@entities/transaction';
import { networkModel } from '@entities/network';
import { Step } from '../types';

export const SignOperation = () => {
  const { t } = useI18n();

  const step = useUnit(signOperationsModel.$step);
  const transactions = useUnit(signOperationsModel.$transactions);
  const chains = useUnit(networkModel.$chains);

  const [isModalOpen, closeModal] = useModalClose(
    !signOperationsUtils.isNoneStep(step),
    signOperationsModel.output.flowFinished,
  );

  if (signOperationsUtils.isSubmitStep(step)) return <OperationSubmit isOpen={isModalOpen} onClose={closeModal} />;

  const getModalTitle = (basketTransaction: BasketTransaction): String | ReactNode => {
    const chain = chains[basketTransaction.coreTx.chainId];

    const { title, params } = getOperationTitle(basketTransaction, chain);

    return <OperationTitle title={`${t(title, { ...params })}`} chainId={basketTransaction.coreTx.chainId} />;
  };

  const getConfirmScreen = (transaction: BasketTransaction) => {
    const type = transaction.coreTx.type;

    if (TransferTypes.includes(type) || XcmTypes.includes(type)) {
      return () => <TransferConfirm onGoBack={() => signOperationsModel.output.flowFinished()} />;
    }

    const Components = {
      // Proxy
      [TransactionType.ADD_PROXY]: () => <AddProxyConfirm onGoBack={() => signOperationsModel.output.flowFinished()} />,
      [TransactionType.REMOVE_PROXY]: () => (
        <RemoveProxyConfirm onGoBack={() => signOperationsModel.output.flowFinished()} />
      ),
      [TransactionType.CREATE_PURE_PROXY]: () => (
        <AddPureProxiedConfirm onGoBack={() => signOperationsModel.output.flowFinished()} />
      ),
      [TransactionType.REMOVE_PURE_PROXY]: () => (
        <RemovePureProxiedConfirm onGoBack={() => signOperationsModel.output.flowFinished()} />
      ),
      // Staking
      [TransactionType.BOND]: () => (
        <BondNominateConfirmation onGoBack={() => signOperationsModel.output.flowFinished()} />
      ),
      [TransactionType.NOMINATE]: () => (
        <NominateConfirmation onGoBack={() => signOperationsModel.output.flowFinished()} />
      ),
      [TransactionType.STAKE_MORE]: () => (
        <BondExtraConfirmation onGoBack={() => signOperationsModel.output.flowFinished()} />
      ),
      [TransactionType.REDEEM]: () => (
        <WithdrawConfirmation onGoBack={() => signOperationsModel.output.flowFinished()} />
      ),
      [TransactionType.RESTAKE]: () => (
        <RestakeConfirmation onGoBack={() => signOperationsModel.output.flowFinished()} />
      ),
      [TransactionType.DESTINATION]: () => (
        <PayeeConfirmation onGoBack={() => signOperationsModel.output.flowFinished()} />
      ),
      [TransactionType.UNSTAKE]: () => (
        <UnstakeConfirmation onGoBack={() => signOperationsModel.output.flowFinished()} />
      ),
    };

    // @ts-ignore
    return Components[type];
  };

  return (
    <BaseModal
      closeButton
      contentClass=""
      isOpen={isModalOpen}
      title={transactions.length && getModalTitle(transactions[0])}
      onClose={closeModal}
    >
      {transactions.length > 0 && signOperationsUtils.isConfirmStep(step) && getConfirmScreen(transactions[0])?.()}

      {signOperationsUtils.isSignStep(step) && (
        <OperationSign onGoBack={() => signOperationsModel.events.stepChanged(Step.CONFIRM)} />
      )}
    </BaseModal>
  );
};
