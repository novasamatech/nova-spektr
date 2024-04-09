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
import { bondNominateModel } from '../model/bond-nominate-model';
import { Step } from '../lib/types';

export const BondNominate = () => {
  const { t } = useI18n();

  const step = useUnit(bondNominateModel.$step);
  const walletData = useUnit(bondNominateModel.$walletData);

  const [isModalOpen, closeModal] = useModalClose(!bondUtils.isNoneStep(step), bondNominateModel.output.flowFinished);

  if (!walletData) return null;

  if (bondUtils.isSubmitStep(step)) return <OperationSubmit isOpen={isModalOpen} onClose={closeModal} />;

  return (
    <BaseModal
      closeButton
      contentClass=""
      panelClass="w-max"
      isOpen={isModalOpen}
      title={
        <OperationTitle
          title={t('staking.bond.title', { asset: walletData.chain.assets[0].symbol })}
          chainId={walletData.chain.chainId}
        />
      }
      onClose={closeModal}
    >
      {bondUtils.isInitStep(step) && <BondForm onGoBack={closeModal} />}
      {bondUtils.isValidatorsStep(step) && (
        <Validators onGoBack={() => bondNominateModel.events.stepChanged(Step.INIT)} />
      )}
      {bondUtils.isConfirmStep(step) && (
        <Confirmation onGoBack={() => bondNominateModel.events.stepChanged(Step.VALIDATORS)} />
      )}
      {bondUtils.isSignStep(step) && (
        <OperationSign onGoBack={() => bondNominateModel.events.stepChanged(Step.CONFIRM)} />
      )}
    </BaseModal>
  );
};
