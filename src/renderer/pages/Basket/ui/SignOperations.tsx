import { ReactNode, useRef, useState } from 'react';
import { useUnit } from 'effector-react';

import { BaseModal, HeaderTitleText, IconButton } from '@shared/ui';
import { useModalClose } from '@shared/lib/hooks';
import { useI18n } from '@app/providers';
import { TransactionType, WalletType, type BasketTransaction } from '@shared/core';
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
import { TransferTypes, XcmTypes } from '@entities/transaction';
import { networkModel } from '@entities/network';
import { OperationTitle } from '@entities/chain';
import { getOperationTitle } from '../lib/operation-title';
import { cnTw } from '@shared/lib/utils';
import { Step } from '../types';
import { SignButton } from '@entities/operations';

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
      // TS doesn't recognize offsetLeft
      // @ts-ignore
      ref.current?.scrollTo({ left: ref.current?.childNodes[0].childNodes[value].offsetLeft - 16, behavior: 'smooth' }),
    );
  };

  if (signOperationsUtils.isSubmitStep(step)) return <OperationSubmit isOpen={isModalOpen} onClose={closeModal} />;

  const getModalTitle = (basketTransaction: BasketTransaction): String | ReactNode => {
    const chain = chains[basketTransaction.coreTx.chainId];

    const { title, params } = getOperationTitle(basketTransaction, chain);

    return (
      <OperationTitle
        className="justify-center my-3"
        title={`${t(title, { ...params })}`}
        chainId={basketTransaction.coreTx.chainId}
      />
    );
  };

  const getConfirmScreen = (transaction: BasketTransaction) => {
    const type = transaction.coreTx.type;

    if (TransferTypes.includes(type) || XcmTypes.includes(type)) {
      return () => <TransferConfirm hideSignButton id={transaction.id} />;
    }

    const Components = {
      // Proxy
      [TransactionType.ADD_PROXY]: () => <AddProxyConfirm hideSignButton />,
      [TransactionType.REMOVE_PROXY]: () => <RemoveProxyConfirm hideSignButton />,
      [TransactionType.CREATE_PURE_PROXY]: () => <AddPureProxiedConfirm hideSignButton />,
      [TransactionType.REMOVE_PURE_PROXY]: () => <RemovePureProxiedConfirm hideSignButton />,
      // Staking
      [TransactionType.BOND]: () => <BondNominateConfirmation hideSignButton />,
      [TransactionType.NOMINATE]: () => <NominateConfirmation hideSignButton />,
      [TransactionType.STAKE_MORE]: () => <BondExtraConfirmation hideSignButton />,
      [TransactionType.REDEEM]: () => <WithdrawConfirmation hideSignButton />,
      [TransactionType.RESTAKE]: () => <RestakeConfirmation hideSignButton />,
      [TransactionType.DESTINATION]: () => <PayeeConfirmation hideSignButton />,
      [TransactionType.UNSTAKE]: () => <UnstakeConfirmation hideSignButton />,
    };

    // @ts-ignore
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
      panelClass={cnTw(signOperationsUtils.isConfirmStep(step) && 'w-[478px]')}
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
          <div className="bg-background-default overflow-x-hidden py-4" ref={ref}>
            {transactions.length > 0 && signOperationsUtils.isConfirmStep(step) && (
              <div className="flex gap-2 first:ml-4 ">
                {transactions.map((t) => (
                  <div key={t.id} className="flex flex-col h-[622px]  last-of-type:pr-4">
                    <div className="w-[440px] bg-white rounded-lg shadow-shadow-2 max-h-full overflow-y-auto">
                      {getModalTitle(t)}
                      {getConfirmScreen(t)?.()}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="flex justify-between bg-white pt-3 px-5 pb-4 rounded-lg">
            <div className="flex gap-2">
              <IconButton
                size={20}
                className="border w-[42px] h-[42px] flex items-center justify-center"
                name="left"
                onClick={previousTx}
              />
              <div
                className={cnTw(
                  'rounded-full font-semibold border border-divider w-[77px] h-[42px]',
                  'text-text-secondary flex items-center justify-center',
                  'shadow-shadow-1',
                )}
              >
                {currentPage}/{transactions.length}
              </div>
              <IconButton
                size={20}
                className="border w-[42px] h-[42px] flex items-center justify-center"
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
