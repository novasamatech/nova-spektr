import { useUnit } from 'effector-react';

import { BaseModal } from '@shared/ui';
import { useModalClose } from '@shared/lib/hooks';
import { OperationTitle } from '@entities/chain';
import { useI18n } from '@app/providers';
import { OperationSign, OperationSubmit } from '@features/operations';
import { BondForm } from './BondForm';
import { Validators } from './Validators';
import { Confirmation } from './Confirmation';
import { bondUtils } from '../lib/bond-utils';
import { bondModel } from '../model/bond-model';
import { Step } from '../lib/types';

export const Bond = () => {
  const { t } = useI18n();

  const step = useUnit(bondModel.$step);
  const networkStore = useUnit(bondModel.$networkStore);

  const [isModalOpen, closeModal] = useModalClose(!bondUtils.isNoneStep(step), bondModel.output.flowFinished);

  if (!networkStore) return null;

  if (bondUtils.isSubmitStep(step)) return <OperationSubmit isOpen={isModalOpen} onClose={closeModal} />;

  return (
    <BaseModal
      closeButton
      contentClass=""
      isOpen={isModalOpen}
      title={
        <OperationTitle
          title={t('staking.bond.title', { asset: networkStore.chain.assets[0].symbol })}
          chainId={networkStore.chain.chainId}
        />
      }
      onClose={closeModal}
    >
      {bondUtils.isInitStep(step) && <BondForm onGoBack={closeModal} />}
      {bondUtils.isValidatorsStep(step) && <Validators onGoBack={closeModal} />}
      {bondUtils.isConfirmStep(step) && <Confirmation onGoBack={() => bondModel.events.stepChanged(Step.INIT)} />}
      {bondUtils.isSignStep(step) && (
        <OperationSign onGoBack={() => bondModel.events.stepChanged(Step.CONFIRM)} />
      )}
    </BaseModal>
  );
};
