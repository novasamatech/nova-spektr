import { useUnit } from 'effector-react';
import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';

import { BaseModal } from '@shared/ui';
import { useModalClose } from '@shared/lib/hooks';
import { OperationTitle } from '@entities/chain';
import { useI18n } from '@app/providers';
import type { Chain, Asset } from '@shared/core';
import { OperationSign, OperationSubmit } from '@features/operations';
import { UnstakeForm } from './UnstakeForm';
import { Confirmation } from './Confirmation';
import { unstakeUtils } from '../lib/unstake-utils';
import { unstakeModel } from '../model/unstake-model';
import { Step } from '../lib/types';
import { Paths } from '@shared/routes';

type Props = {
  chain: Chain;
  asset: Asset;
};

export const Unstake = ({ chain, asset }: Props) => {
  const { t } = useI18n();

  const navigate = useNavigate();

  const step = useUnit(unstakeModel.$step);

  const [isModalOpen, closeModal] = useModalClose(!unstakeUtils.isNoneStep(step), () => {
    navigate(Paths.STAKING);
    unstakeModel.output.flowFinished();
  });

  useEffect(() => {
    unstakeModel.events.flowStarted({ chain, asset });
  }, []);

  useEffect(() => {
    unstakeModel.events.navigateApiChanged({ navigate });
  }, []);

  if (unstakeUtils.isSubmitStep(step)) return <OperationSubmit isOpen={isModalOpen} onClose={closeModal} />;

  return (
    <BaseModal
      closeButton
      contentClass=""
      isOpen={isModalOpen}
      title={<OperationTitle title={t('staking.unstake.title')} chainId={chain.chainId} />}
      onClose={closeModal}
    >
      {unstakeUtils.isInitStep(step) && <UnstakeForm onGoBack={closeModal} />}
      {unstakeUtils.isConfirmStep(step) && <Confirmation onGoBack={() => unstakeModel.events.stepChanged(Step.INIT)} />}
      {unstakeUtils.isSignStep(step) && (
        <OperationSign onGoBack={() => unstakeModel.events.stepChanged(Step.CONFIRM)} />
      )}
    </BaseModal>
  );
};
