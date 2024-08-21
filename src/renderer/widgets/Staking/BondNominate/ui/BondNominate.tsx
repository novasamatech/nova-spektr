import { useUnit } from 'effector-react';
import { useEffect } from 'react';

import { useI18n } from '@app/providers';
import { useModalClose } from '@shared/lib/hooks';
import { BaseModal, Button } from '@shared/ui';
import { OperationTitle } from '@entities/chain';
import { OperationResult } from '@entities/transaction';
import { OperationSign, OperationSubmit } from '@features/operations';
import { BondNominateConfirmation as Confirmation, basketUtils } from '@features/operations/OperationsConfirm';
import { Validators } from '@features/staking';
import { bondUtils } from '../lib/bond-utils';
import { Step } from '../lib/types';
import { bondNominateModel } from '../model/bond-nominate-model';

import { BondForm } from './BondForm';

export const BondNominate = () => {
  const { t } = useI18n();

  const step = useUnit(bondNominateModel.$step);
  const walletData = useUnit(bondNominateModel.$walletData);
  const initiatorWallet = useUnit(bondNominateModel.$initiatorWallet);

  const [isModalOpen, closeModal] = useModalClose(!bondUtils.isNoneStep(step), bondNominateModel.output.flowFinished);
  const [isBasketModalOpen, closeBasketModal] = useModalClose(
    bondUtils.isBasketStep(step),
    bondNominateModel.output.flowFinished,
  );

  useEffect(() => {
    if (bondUtils.isBasketStep(step)) {
      const timer = setTimeout(() => closeBasketModal(), 1450);

      return () => clearTimeout(timer);
    }
  }, [step]);

  if (!walletData) {
    return null;
  }

  if (bondUtils.isSubmitStep(step)) {
    return <OperationSubmit isOpen={isModalOpen} onClose={closeModal} />;
  }
  if (bondUtils.isBasketStep(step)) {
    return (
      <OperationResult
        isOpen={isBasketModalOpen}
        variant="success"
        title={t('operation.addedToBasket')}
        onClose={closeBasketModal}
      />
    );
  }

  return (
    <BaseModal
      closeButton
      contentClass=""
      panelStyle={
        // Change panel class doesn't work
        {
          ...(bondUtils.isValidatorsStep(step) && {
            width: '784px',
          }),
        }
      }
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
        <Confirmation
          secondaryActionButton={
            initiatorWallet &&
            basketUtils.isBasketAvailable(initiatorWallet) && (
              <Button pallet="secondary" onClick={() => bondNominateModel.events.txSaved()}>
                {t('operation.addToBasket')}
              </Button>
            )
          }
          onGoBack={() => bondNominateModel.events.stepChanged(Step.VALIDATORS)}
        />
      )}
      {bondUtils.isSignStep(step) && (
        <OperationSign onGoBack={() => bondNominateModel.events.stepChanged(Step.CONFIRM)} />
      )}
    </BaseModal>
  );
};
