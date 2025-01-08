import { useGate, useUnit } from 'effector-react';

import { type Chain, type Wallet } from '@/shared/core';
import { useI18n } from '@/shared/i18n';
import { useModalClose } from '@/shared/lib/hooks';
import { BaseModal, Button } from '@/shared/ui';
import { OperationTitle } from '@/entities/chain';
import { OperationResult } from '@/entities/transaction';
import { OperationSign, OperationSubmit } from '@/features/operations';
import { AddPureProxiedConfirm } from '@/features/operations/OperationsConfirm/AddPureProxied';
import { basketUtils } from '@/features/operations/OperationsConfirm/lib/basket-utils';
import { addPureProxiedUtils } from '../lib/add-pure-proxied-utils';
import { Step } from '../lib/types';
import { addPureProxiedModel } from '../model/add-pure-proxied-model';
import { formModel } from '../model/form-model';

import { AddPureProxiedForm } from './AddPureProxiedForm';

type Props = {
  wallet: Wallet;
};

export const AddPureProxied = ({ wallet }: Props) => {
  useGate(formModel.flow, { wallet });

  const { t } = useI18n();

  const step = useUnit(addPureProxiedModel.$step);
  const chain = useUnit(addPureProxiedModel.$chain);
  const initiatorWallet = useUnit(addPureProxiedModel.$initiatorWallet);

  const [isModalOpen, closeModal] = useModalClose(
    !addPureProxiedUtils.isNoneStep(step),
    addPureProxiedModel.output.flowFinished,
  );
  const [isBasketModalOpen, closeBasketModal] = useModalClose(
    addPureProxiedUtils.isBasketStep(step),
    addPureProxiedModel.output.flowFinished,
  );

  const getModalTitle = (step: Step, chain?: Chain) => {
    if (addPureProxiedUtils.isInitStep(step) || !chain) {
      return t('operations.modalTitles.addPureProxy');
    }

    return <OperationTitle title={t('operations.modalTitles.addPureProxyOn')} chainId={chain.chainId} />;
  };

  if (addPureProxiedUtils.isSubmitStep(step)) {
    return <OperationSubmit isOpen={isModalOpen} onClose={closeModal} />;
  }

  if (addPureProxiedUtils.isBasketStep(step)) {
    return (
      <OperationResult
        isOpen={isBasketModalOpen}
        variant="success"
        title={t('operation.addedToBasket')}
        autoCloseTimeout={2000}
        onClose={closeBasketModal}
      />
    );
  }

  return (
    <BaseModal closeButton contentClass="" isOpen={isModalOpen} title={getModalTitle(step, chain)} onClose={closeModal}>
      {addPureProxiedUtils.isInitStep(step) && <AddPureProxiedForm onGoBack={closeModal} />}
      {addPureProxiedUtils.isConfirmStep(step) && (
        <AddPureProxiedConfirm
          secondaryActionButton={
            initiatorWallet &&
            basketUtils.isBasketAvailable(initiatorWallet) && (
              <Button pallet="secondary" onClick={() => addPureProxiedModel.events.txSaved()}>
                {t('operation.addToBasket')}
              </Button>
            )
          }
          onGoBack={() => addPureProxiedModel.events.stepChanged(Step.INIT)}
        />
      )}
      {addPureProxiedUtils.isSignStep(step) && (
        <OperationSign onGoBack={() => addPureProxiedModel.events.stepChanged(Step.CONFIRM)} />
      )}
    </BaseModal>
  );
};
