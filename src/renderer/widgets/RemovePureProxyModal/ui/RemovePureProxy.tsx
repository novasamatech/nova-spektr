import { useUnit } from 'effector-react';

import { BaseModal } from '@shared/ui';
import { useModalClose } from '@shared/lib/hooks';
import { OperationTitle } from '@entities/chain';
import { useI18n } from '@app/providers';
import type { Chain } from '@shared/core';
import { Step } from '../lib/types';
import { RemovePureProxyForm } from './RemovePureProxyForm';
import { Confirmation } from './Confirm';
import { removePureProxyUtils } from '../lib/remove-pure-proxy-utils';
import { removePureProxyModel } from '../model/remove-pure-proxy-model';
import { Warning } from './Warning';
import { OperationSign, OperationSubmit } from '@features/operations';

export const RemovePureProxy = () => {
  const { t } = useI18n();

  const step = useUnit(removePureProxyModel.$step);
  const chain = useUnit(removePureProxyModel.$chain);

  const [isModalOpen, closeModal] = useModalClose(
    !removePureProxyUtils.isNoneStep(step),
    removePureProxyModel.output.flowFinished,
  );

  const getModalTitle = (step: Step, chain?: Chain) => {
    if (removePureProxyUtils.isInitStep(step) || !chain) return t('operations.modalTitles.removePureProxy');

    return <OperationTitle title={t('operations.modalTitles.removePureProxyOn')} chainId={chain.chainId} />;
  };

  if (removePureProxyUtils.isSubmitStep(step)) return <OperationSubmit isOpen={isModalOpen} onClose={closeModal} />;

  return (
    <BaseModal closeButton contentClass="" isOpen={isModalOpen} title={getModalTitle(step, chain)} onClose={closeModal}>
      {removePureProxyUtils.isWarningStep(step) && <Warning onGoBack={closeModal} />}
      {removePureProxyUtils.isInitStep(step) && <RemovePureProxyForm onGoBack={closeModal} />}
      {removePureProxyUtils.isConfirmStep(step) && (
        <Confirmation onGoBack={() => removePureProxyModel.events.stepChanged(Step.INIT)} />
      )}
      {removePureProxyUtils.isSignStep(step) && (
        <OperationSign onGoBack={() => removePureProxyModel.events.stepChanged(Step.CONFIRM)} />
      )}
    </BaseModal>
  );
};
