import { useUnit } from 'effector-react';

import { useI18n } from '@/shared/i18n';
import { useModalClose } from '@/shared/lib/hooks';
import { BaseModal, Button } from '@/shared/ui';
import { basketUtils } from '@/entities/basket';
import { OperationTitle } from '@/entities/chain';
import { OperationResult } from '@/entities/transaction';
import { OperationSign, OperationSubmit } from '@/features/operations';
import { BondNominateConfirmation as Confirmation } from '@/features/operations/OperationsConfirm';
import { Validators } from '@/features/staking';
import { Step } from '../lib/types';
import { bondNominateUtils } from '../lib/utils';
import { bondNominateFlowShards } from '../model/flow-shards';

import { BondFormShards } from './BondFormShards';

export const BondNominateShards = () => {
  const { t } = useI18n();

  const step = useUnit(bondNominateFlowShards.$step);
  const walletData = useUnit(bondNominateFlowShards.$walletData);
  const initiatorWallet = useUnit(bondNominateFlowShards.$initiatorWallet);

  const [isModalOpen, closeModal] = useModalClose(
    !bondNominateUtils.isNoneStep(step),
    bondNominateFlowShards.flowFinished,
  );
  const [isBasketModalOpen, closeBasketModal] = useModalClose(
    bondNominateUtils.isBasketStep(step),
    bondNominateFlowShards.flowFinished,
  );

  if (!walletData) {
    return null;
  }

  if (bondNominateUtils.isSubmitStep(step)) {
    return <OperationSubmit isOpen={isModalOpen} onClose={closeModal} />;
  }
  if (bondNominateUtils.isBasketStep(step)) {
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
    <BaseModal
      closeButton
      contentClass=""
      panelClass="w-fit"
      isOpen={isModalOpen}
      title={
        <OperationTitle
          title={t('staking.bond.title', { asset: walletData.chain.assets[0]!.symbol })}
          chainId={walletData.chain.chainId}
        />
      }
      onClose={closeModal}
    >
      {bondNominateUtils.isInitStep(step) && <BondFormShards onGoBack={closeModal} />}
      {bondNominateUtils.isValidatorsStep(step) && (
        <Validators onGoBack={() => bondNominateFlowShards.stepChanged(Step.INIT)} />
      )}
      {bondNominateUtils.isConfirmStep(step) && (
        <Confirmation
          secondaryActionButton={
            initiatorWallet &&
            basketUtils.isBasketAvailable(initiatorWallet) && (
              <Button pallet="secondary" onClick={() => bondNominateFlowShards.txSaved()}>
                {t('operation.addToBasket')}
              </Button>
            )
          }
          onGoBack={() => bondNominateFlowShards.stepChanged(Step.VALIDATORS)}
        />
      )}
      {bondNominateUtils.isSignStep(step) && (
        <OperationSign onGoBack={() => bondNominateFlowShards.stepChanged(Step.CONFIRM)} />
      )}
    </BaseModal>
  );
};
