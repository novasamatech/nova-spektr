import { useUnit } from 'effector-react';
import { type ReactNode } from 'react';

import { type BasketTransaction, TransactionType, WalletType } from '@/shared/core';
import { useI18n } from '@/shared/i18n';
import { useModalClose } from '@/shared/lib/hooks';
import { BaseModal, HeaderTitleText } from '@/shared/ui';
import { OperationTitle } from '@/entities/chain';
import { networkModel } from '@/entities/network';
import { SignButton } from '@/entities/operations';
import {
  type MultisigTransactionTypes,
  type TransferTransactionTypes,
  TransferTypes,
  type UtilityTransactionTypes,
  type XcmTransactionTypes,
  XcmTypes,
  isEditDelegationTransaction,
} from '@/entities/transaction';
import { OperationSign, OperationSubmit } from '@/features/operations';
import {
  AddProxyConfirm,
  AddPureProxiedConfirm,
  BondExtraConfirmation,
  BondNominateConfirmation,
  ConfirmSlider,
  DelegateConfirmation,
  EditDelegationConfirmation,
  NominateConfirmation,
  PayeeConfirmation,
  RemoveProxyConfirm,
  RemovePureProxiedConfirm,
  RemoveVoteConfirmation,
  RestakeConfirmation,
  RevokeDelegationConfirmation,
  TransferConfirm,
  UnstakeConfirmation,
  VoteConfirmation,
  WithdrawConfirmation,
} from '@/features/operations/OperationsConfirm';
import { UnlockConfirmation } from '@/widgets/UnlockModal';
import { getOperationTitle } from '../lib/operation-title';
import { signOperationsUtils } from '../lib/sign-operations-utils';
import { getCoreTx } from '../lib/utils';
import { signOperationsModel } from '../model/sign-operations-model';
import { Step } from '../types';

export const SignOperations = () => {
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

    return (
      <OperationTitle
        className="m-3 justify-center"
        title={`${t(title, { ...params })}`}
        chainId={basketTransaction.coreTx.chainId}
      />
    );
  };

  const getConfirmScreen = (transaction: BasketTransaction) => {
    const coreTx = getCoreTx(transaction);
    const type = coreTx.type;
    const config = { withFormatAmount: false };

    if (TransferTypes.includes(type) || XcmTypes.includes(type)) {
      return () => <TransferConfirm id={transaction.id} hideSignButton />;
    }

    if (isEditDelegationTransaction(coreTx)) {
      return () => <EditDelegationConfirmation id={transaction.id} hideSignButton config={config} />;
    }

    const Components: Record<
      Exclude<
        TransactionType,
        | TransferTransactionTypes
        | XcmTransactionTypes
        | MultisigTransactionTypes
        | UtilityTransactionTypes
        | TransactionType.REMARK
      >,
      () => ReactNode
    > = {
      // Proxy
      [TransactionType.ADD_PROXY]: () => <AddProxyConfirm id={transaction.id} hideSignButton />,
      [TransactionType.REMOVE_PROXY]: () => <RemoveProxyConfirm id={transaction.id} hideSignButton />,
      [TransactionType.CREATE_PURE_PROXY]: () => <AddPureProxiedConfirm id={transaction.id} hideSignButton />,
      [TransactionType.REMOVE_PURE_PROXY]: () => <RemovePureProxiedConfirm id={transaction.id} hideSignButton />,
      // Staking
      [TransactionType.BOND]: () => <BondNominateConfirmation id={transaction.id} hideSignButton config={config} />,
      [TransactionType.NOMINATE]: () => <NominateConfirmation id={transaction.id} hideSignButton />,
      [TransactionType.STAKE_MORE]: () => <BondExtraConfirmation id={transaction.id} hideSignButton config={config} />,
      [TransactionType.REDEEM]: () => <WithdrawConfirmation id={transaction.id} hideSignButton />,
      [TransactionType.RESTAKE]: () => <RestakeConfirmation id={transaction.id} hideSignButton />,
      [TransactionType.DESTINATION]: () => <PayeeConfirmation id={transaction.id} hideSignButton />,
      [TransactionType.UNSTAKE]: () => <UnstakeConfirmation id={transaction.id} hideSignButton />,
      [TransactionType.DELEGATE]: () => <DelegateConfirmation id={transaction.id} hideSignButton config={config} />,
      [TransactionType.EDIT_DELEGATION]: () => (
        <EditDelegationConfirmation id={transaction.id} hideSignButton config={config} />
      ),
      [TransactionType.UNDELEGATE]: () => (
        <RevokeDelegationConfirmation id={transaction.id} hideSignButton config={config} />
      ),
      [TransactionType.VOTE]: () => <VoteConfirmation id={transaction.id} hideSignButton />,
      [TransactionType.REVOTE]: () => <VoteConfirmation id={transaction.id} hideSignButton />,
      [TransactionType.REMOVE_VOTE]: () => <RemoveVoteConfirmation id={transaction.id} hideSignButton />,
      [TransactionType.UNLOCK]: () => <UnlockConfirmation id={transaction.id} hideSignButton />,

      // TODO implement
      [TransactionType.COLLECTIVE_VOTE]: () => null,
    };

    // @ts-expect-error not all types are used
    return Components[type];
  };

  return (
    <BaseModal
      closeButton
      contentClass=""
      panelStyle={
        // Change panel class doesn't work
        {
          ...(signOperationsUtils.isConfirmStep(step) && {
            //eslint-disable-next-line i18next/no-literal-string
            width: `478px`,
          }),
        }
      }
      headerClass="py-3 pl-5 pr-3"
      isOpen={isModalOpen}
      title={
        <HeaderTitleText>{t('basket.signOperations.title', { transactions: transactions?.length })}</HeaderTitleText>
      }
      onClose={() => closeModal()}
    >
      {signOperationsUtils.isConfirmStep(step) && (
        <ConfirmSlider
          count={transactions.length}
          footer={
            <SignButton isDefault type={WalletType.POLKADOT_VAULT} onClick={signOperationsModel.events.txsConfirmed} />
          }
        >
          {transactions.map((t) => (
            <ConfirmSlider.Item key={t.id}>
              {getModalTitle(t)}
              {getConfirmScreen(t)?.()}
            </ConfirmSlider.Item>
          ))}
        </ConfirmSlider>
      )}

      {signOperationsUtils.isSignStep(step) && (
        <OperationSign onGoBack={() => signOperationsModel.events.stepChanged(Step.CONFIRM)} />
      )}
    </BaseModal>
  );
};
