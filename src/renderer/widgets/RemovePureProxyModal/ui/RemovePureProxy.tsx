import { useUnit } from 'effector-react';

import { BaseModal } from '@shared/ui';
import { useModalClose } from '@shared/lib/hooks';
import { OperationTitle } from '@entities/chain';
import { useI18n } from '@app/providers';
import type { Chain } from '@shared/core';
import { Step } from '../lib/types';
import { RemovePureProxyForm } from './RemovePureProxyForm';
import { Confirmation } from './Confirm';
import { Sign } from './Sign';
import { Submit } from './Submit';
import { removePureProxyUtils } from '../lib/remove-pure-proxy-utils';
import { removePureProxyModel } from '../model/remove-pure-proxy-model';
import { Warning } from './Warning';

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

  if (removePureProxyUtils.isSubmitStep(step)) return <Submit isOpen={isModalOpen} onClose={closeModal} />;

  return (
    <BaseModal closeButton contentClass="" isOpen={isModalOpen} title={getModalTitle(step, chain)} onClose={closeModal}>
      {removePureProxyUtils.isWarningStep(step) && <Warning onGoBack={closeModal} />}
      {removePureProxyUtils.isInitStep(step) && <RemovePureProxyForm onGoBack={closeModal} />}
      {removePureProxyUtils.isConfirmStep(step) && (
        <Confirmation onGoBack={() => removePureProxyModel.events.stepChanged(Step.INIT)} />
      )}
      {removePureProxyUtils.isSignStep(step) && (
        <Sign onGoBack={() => removePureProxyModel.events.stepChanged(Step.CONFIRM)} />
      )}
    </BaseModal>
  );
};
