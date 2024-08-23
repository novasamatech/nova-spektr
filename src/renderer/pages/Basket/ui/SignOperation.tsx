import { useUnit } from 'effector-react';
import { type ReactNode } from 'react';

import { useI18n } from '@app/providers';
import { type BasketTransaction, TransactionType } from '@shared/core';
import { useModalClose } from '@shared/lib/hooks';
import { BaseModal } from '@shared/ui';
import { OperationTitle } from '@entities/chain';
import { networkModel } from '@entities/network';
import { TransferTypes, XcmTypes } from '@entities/transaction';
import { OperationSign, OperationSubmit } from '@features/operations';
import {
  AddProxyConfirm,
  AddPureProxiedConfirm,
  BondExtraConfirmation,
  BondNominateConfirmation,
  DelegateConfirmation,
  NominateConfirmation,
  PayeeConfirmation,
  RemoveProxyConfirm,
  RemovePureProxiedConfirm,
  RemoveVoteConfirmation,
  RestakeConfirmation,
  TransferConfirm,
  UnstakeConfirmation,
  VoteConfirmation,
  WithdrawConfirmation,
} from '@features/operations/OperationsConfirm';
import { UnlockConfirmation } from '@/widgets/UnlockModal/ui/UnlockConfirmation';
import { getOperationTitle } from '../lib/operation-title';
import { signOperationsUtils } from '../lib/sign-operations-utils';
import { getCoreTx } from '../lib/utils';
import { signOperationsModel } from '../model/sign-operations-model';
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

  if (signOperationsUtils.isSubmitStep(step)) {
    return <OperationSubmit isOpen={isModalOpen} onClose={closeModal} />;
  }

  const getModalTitle = (basketTransaction: BasketTransaction): string | ReactNode => {
    const chain = chains[basketTransaction.coreTx.chainId];

    const { title, params } = getOperationTitle(basketTransaction, chain);

    return <OperationTitle title={`${t(title, { ...params })}`} chainId={basketTransaction.coreTx.chainId} />;
  };

  const getConfirmScreen = (transaction: BasketTransaction) => {
    const coreTx = getCoreTx(transaction);

    const type = coreTx.type;
    const config = { withFormatAmount: false };

    if (TransferTypes.includes(type) || XcmTypes.includes(type)) {
      return () => <TransferConfirm id={transaction.id} onGoBack={() => signOperationsModel.output.flowFinished()} />;
    }

    const Components = {
      // Proxy
      [TransactionType.ADD_PROXY]: () => (
        <AddProxyConfirm id={transaction.id} onGoBack={() => signOperationsModel.output.flowFinished()} />
      ),
      [TransactionType.REMOVE_PROXY]: () => (
        <RemoveProxyConfirm id={transaction.id} onGoBack={() => signOperationsModel.output.flowFinished()} />
      ),
      [TransactionType.CREATE_PURE_PROXY]: () => (
        <AddPureProxiedConfirm id={transaction.id} onGoBack={() => signOperationsModel.output.flowFinished()} />
      ),
      [TransactionType.REMOVE_PURE_PROXY]: () => (
        <RemovePureProxiedConfirm id={transaction.id} onGoBack={() => signOperationsModel.output.flowFinished()} />
      ),
      // Staking
      [TransactionType.BOND]: () => (
        <BondNominateConfirmation
          id={transaction.id}
          config={config}
          onGoBack={() => signOperationsModel.output.flowFinished()}
        />
      ),
      [TransactionType.NOMINATE]: () => (
        <NominateConfirmation id={transaction.id} onGoBack={() => signOperationsModel.output.flowFinished()} />
      ),
      [TransactionType.STAKE_MORE]: () => (
        <BondExtraConfirmation
          id={transaction.id}
          config={config}
          onGoBack={() => signOperationsModel.output.flowFinished()}
        />
      ),
      [TransactionType.REDEEM]: () => (
        <WithdrawConfirmation id={transaction.id} onGoBack={() => signOperationsModel.output.flowFinished()} />
      ),
      [TransactionType.RESTAKE]: () => (
        <RestakeConfirmation id={transaction.id} onGoBack={() => signOperationsModel.output.flowFinished()} />
      ),
      [TransactionType.DESTINATION]: () => (
        <PayeeConfirmation id={transaction.id} onGoBack={() => signOperationsModel.output.flowFinished()} />
      ),
      [TransactionType.UNSTAKE]: () => (
        <UnstakeConfirmation id={transaction.id} onGoBack={() => signOperationsModel.output.flowFinished()} />
      ),
      [TransactionType.DELEGATE]: () => (
        <DelegateConfirmation
          id={transaction.id}
          config={config}
          onGoBack={() => signOperationsModel.output.flowFinished()}
        />
      ),
      [TransactionType.VOTE]: () => (
        <VoteConfirmation id={transaction.id} onGoBack={() => signOperationsModel.output.flowFinished()} />
      ),
      [TransactionType.REMOVE_VOTE]: () => (
        <RemoveVoteConfirmation id={transaction.id} onGoBack={() => signOperationsModel.output.flowFinished()} />
      ),
      [TransactionType.UNLOCK]: () => (
        <UnlockConfirmation id={transaction.id} onGoBack={() => signOperationsModel.output.flowFinished()} />
      ),
    };

    // @ts-expect-error not all types are used
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
