import { useGate, useUnit } from 'effector-react';
import { useEffect } from 'react';

import { type Asset, type Chain, type OngoingReferendum } from '@/shared/core';
import { useI18n } from '@/shared/i18n';
import { useModalClose } from '@/shared/lib/hooks';
import { Step, isStep } from '@/shared/lib/utils';
import { BaseModal, Button } from '@/shared/ui';
import { basketUtils } from '@/entities/basket';
import { OperationTitle } from '@/entities/chain';
import { OperationResult } from '@/entities/transaction';
import { type AggregatedReferendum } from '@/features/governance';
import { OperationSign, OperationSubmit } from '@/features/operations';
import { VoteConfirmation } from '@/features/operations/OperationsConfirm';
import { voteForm } from '../model/voteForm';
import { voteModal } from '../model/voteModal';

import { VoteForm } from './VoteForm';

type Props = {
  referendum: AggregatedReferendum<OngoingReferendum>;
  chain: Chain;
  asset: Asset;
  onClose: VoidFunction;
  onVoteSuccess?: VoidFunction;
};

export const RevoteModal = ({ referendum, asset, chain, onClose, onVoteSuccess }: Props) => {
  const { t } = useI18n();

  useGate(voteModal.gates.flow, { type: 'revote', referendum });

  const step = useUnit(voteModal.$step);
  const voteSuccess = useUnit(voteModal.$voteSuccess);
  const initiatorWallet = useUnit(voteForm.$initiatorWallet);

  const [isModalOpen, closeModal] = useModalClose(step !== Step.NONE, onClose);
  const [isBasketModalOpen, closeBasketModal] = useModalClose(step === Step.BASKET, onClose);

  useEffect(() => {
    if (voteSuccess) {
      onVoteSuccess?.();
    }
  }, [voteSuccess, onVoteSuccess]);

  if (isStep(step, Step.SUBMIT)) {
    return <OperationSubmit isOpen={isModalOpen} onClose={closeModal} />;
  }

  if (isStep(step, Step.BASKET)) {
    return (
      <OperationResult
        isOpen={isBasketModalOpen}
        variant="success"
        autoCloseTimeout={2000}
        title={t('operation.addedToBasket')}
        onClose={closeBasketModal}
      />
    );
  }

  return (
    <BaseModal
      isOpen
      closeButton
      title={<OperationTitle title={t('governance.voting.revoteTitle')} chainId={chain.chainId}></OperationTitle>}
      headerClass="px-5 py-3"
      panelClass="flex flex-col w-modal max-h-[736px]"
      contentClass="flex flex-col h-full min-h-0 overflow-y-auto shrink"
      onClose={onClose}
    >
      {isStep(step, Step.INIT) && <VoteForm chain={chain} asset={asset} />}
      {isStep(step, Step.CONFIRM) && (
        <VoteConfirmation
          secondaryActionButton={
            initiatorWallet &&
            basketUtils.isBasketAvailable(initiatorWallet) && (
              <Button pallet="secondary" onClick={() => voteModal.events.txSaved()}>
                {t('operation.addToBasket')}
              </Button>
            )
          }
          onGoBack={() => voteModal.events.setStep(Step.INIT)}
        />
      )}
      {isStep(step, Step.SIGN) && <OperationSign onGoBack={() => voteModal.events.setStep(Step.CONFIRM)} />}
    </BaseModal>
  );
};
