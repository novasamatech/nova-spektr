import { useUnit } from 'effector-react';

import { BaseModal, Button } from '@shared/ui';
import { useModalClose } from '@shared/lib/hooks';
import { OperationTitle } from '@entities/chain';
import { useI18n } from '@app/providers';
import type { Chain } from '@shared/core';
import { OperationSign, OperationSubmit } from '@features/operations';
import { Step } from '../lib/types';
import { AddPureProxiedForm } from './AddPureProxiedForm';
import { addPureProxiedUtils } from '../lib/add-pure-proxied-utils';
import { addPureProxiedModel } from '../model/add-pure-proxied-model';
import { basketUtils, AddPureProxiedConfirm } from '@features/operations/OperationsConfirm';

export const AddPureProxied = () => {
  const { t } = useI18n();

  const step = useUnit(addPureProxiedModel.$step);
  const chain = useUnit(addPureProxiedModel.$chain);
  const initiatorWallet = useUnit(addPureProxiedModel.$initiatorWallet);

  const [isModalOpen, closeModal] = useModalClose(
    !addPureProxiedUtils.isNoneStep(step),
    addPureProxiedModel.output.flowFinished,
  );

  const getModalTitle = (step: Step, chain?: Chain) => {
    if (addPureProxiedUtils.isInitStep(step) || !chain) return t('operations.modalTitles.addPureProxy');

    return <OperationTitle title={t('operations.modalTitles.addPureProxyOn')} chainId={chain.chainId} />;
  };

  if (addPureProxiedUtils.isSubmitStep(step)) return <OperationSubmit isOpen={isModalOpen} onClose={closeModal} />;

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
