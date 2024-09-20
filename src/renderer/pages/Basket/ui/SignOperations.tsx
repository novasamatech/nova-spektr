import { useUnit } from 'effector-react';
import { type ReactNode, useRef, useState } from 'react';

import { useI18n } from '@app/providers';
import { type BasketTransaction, TransactionType, WalletType } from '@shared/core';
import { useModalClose } from '@shared/lib/hooks';
import { cnTw } from '@shared/lib/utils';
import { BaseModal, HeaderTitleText, IconButton } from '@shared/ui';
import { OperationTitle } from '@entities/chain';
import { networkModel } from '@entities/network';
import { SignButton } from '@entities/operations';
import {
  type MultisigTransactionTypes,
  type TransferTransactionTypes,
  TransferTypes,
  type UtilityTransactionTypes,
  type XcmTransactionTypes,
  XcmTypes,
  isEditDelegationTransaction,
} from '@entities/transaction';
import { OperationSign, OperationSubmit } from '@features/operations';
import {
  AddProxyConfirm,
  AddPureProxiedConfirm,
  BondExtraConfirmation,
  BondNominateConfirmation,
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
} from '@features/operations/OperationsConfirm';
import { UnlockConfirmation } from '@/widgets/UnlockModal/ui/UnlockConfirmation';
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

  const [currentTx, setCurrentTx] = useState(0);

  const [isModalOpen, closeModal] = useModalClose(
    !signOperationsUtils.isNoneStep(step),
    signOperationsModel.output.flowFinished,
  );

  const ref = useRef<HTMLDivElement>(null);

  const scroll = (value: number) => {
    setTimeout(() =>
      // @ts-expect-error TS doesn't recognize offsetLeft
      ref.current?.scrollTo({ left: ref.current?.childNodes[0].childNodes[value].offsetLeft - 16, behavior: 'smooth' }),
    );
  };

  if (signOperationsUtils.isSubmitStep(step)) {
    return <OperationSubmit isOpen={isModalOpen} onClose={closeModal} />;
  }

  const getModalTitle = (basketTransaction: BasketTransaction): string | ReactNode => {
    const chain = chains[basketTransaction.coreTx.chainId];

    const { title, params } = getOperationTitle(basketTransaction, chain);

    return (
      <OperationTitle
        className="my-3 justify-center"
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
        TransferTransactionTypes | XcmTransactionTypes | MultisigTransactionTypes | UtilityTransactionTypes
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
    };

    // @ts-expect-error not all types are used
    return Components[type];
  };

  const nextTx = () => {
    if (currentTx < transactions.length - 1) {
      const newValue = currentTx + 1;

      setCurrentTx(newValue);
      scroll(newValue);
    }
  };

  const previousTx = () => {
    if (currentTx > 0) {
      const newValue = currentTx - 1;

      setCurrentTx(newValue);
      scroll(newValue);
    }
  };

  const currentPage = currentTx + 1;

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
      onClose={() => {
        closeModal();
        setCurrentTx(0);
      }}
    >
      {signOperationsUtils.isConfirmStep(step) && (
        <>
          <div className="overflow-x-hidden bg-background-default py-4" ref={ref}>
            {transactions.length > 0 && signOperationsUtils.isConfirmStep(step) && (
              <div className="flex gap-2 first:ml-4">
                {transactions.map((t) => (
                  <div key={t.id} className="flex h-[622px] flex-col last-of-type:pr-4">
                    <div className="max-h-full w-[440px] overflow-y-auto rounded-lg bg-white shadow-shadow-2">
                      {getModalTitle(t)}
                      {getConfirmScreen(t)?.()}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="flex justify-between rounded-lg bg-white px-5 pb-4 pt-3">
            <div className="flex gap-2">
              <IconButton
                size={20}
                className="flex h-[42px] w-[42px] items-center justify-center border"
                name="left"
                onClick={previousTx}
              />
              <div
                className={cnTw(
                  'h-[42px] w-[77px] rounded-full border border-divider font-semibold',
                  'flex items-center justify-center text-text-secondary',
                  'shadow-shadow-1',
                )}
              >
                {currentPage}/{transactions.length}
              </div>
              <IconButton
                size={20}
                className="flex h-[42px] w-[42px] items-center justify-center border"
                name="right"
                onClick={nextTx}
              />
            </div>

            <SignButton type={WalletType.POLKADOT_VAULT} onClick={signOperationsModel.events.txsConfirmed} />
          </div>
        </>
      )}

      {signOperationsUtils.isSignStep(step) && (
        <OperationSign onGoBack={() => signOperationsModel.events.stepChanged(Step.CONFIRM)} />
      )}
    </BaseModal>
  );
};
