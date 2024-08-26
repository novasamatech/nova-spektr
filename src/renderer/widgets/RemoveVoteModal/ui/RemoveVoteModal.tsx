import { type ApiPromise } from '@polkadot/api';
import { useGate, useUnit } from 'effector-react';

import { useI18n } from '@app/providers';
import { type AccountVote, type Asset, type Chain, type OngoingReferendum } from '@shared/core';
import { useModalClose } from '@shared/lib/hooks';
import { Step, isStep } from '@shared/lib/utils';
import { BaseModal, Button } from '@shared/ui';
import { OperationTitle } from '@entities/chain';
import { OperationResult } from '@entities/transaction';
import { OperationSign, OperationSubmit } from '@features/operations';
import { RemoveVoteConfirmation, basketUtils } from '@features/operations/OperationsConfirm';
import { removeVoteModalAggregate } from '../aggregates/removeVoteModal';

type Props = {
  referendum: OngoingReferendum;
  vote: AccountVote;
  api: ApiPromise;
  chain: Chain;
  asset: Asset;
  onClose: VoidFunction;
};

export const RemoveVoteModal = ({ referendum, vote, chain, asset, api, onClose }: Props) => {
  useGate(removeVoteModalAggregate.gates.flow, { referendum, vote, chain, asset, api });

  const { t } = useI18n();
  const step = useUnit(removeVoteModalAggregate.$step);
  const initiatorWallet = useUnit(removeVoteModalAggregate.$initiatorWallet);

  const [isModalOpen, closeModal] = useModalClose(step !== Step.NONE, onClose);
  const [isBasketModalOpen, closeBasketModal] = useModalClose(step === Step.BASKET, onClose);

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
      title={<OperationTitle title={t('operations.modalTitles.removeVoteOn')} chainId={chain.chainId}></OperationTitle>}
      headerClass="px-5 py-3"
      panelClass="flex flex-col w-modal max-h-[678px]"
      contentClass="flex flex-col h-full min-h-0 overflow-y-auto shrink"
      onClose={onClose}
    >
      {isStep(step, Step.CONFIRM) && (
        <RemoveVoteConfirmation
          secondaryActionButton={
            initiatorWallet &&
            basketUtils.isBasketAvailable(initiatorWallet) && (
              <Button pallet="secondary" onClick={() => removeVoteModalAggregate.events.txSaved()}>
                {t('operation.addToBasket')}
              </Button>
            )
          }
          onGoBack={() => removeVoteModalAggregate.events.setStep(Step.INIT)}
        />
      )}
      {isStep(step, Step.SIGN) && (
        <OperationSign onGoBack={() => removeVoteModalAggregate.events.setStep(Step.CONFIRM)} />
      )}
    </BaseModal>
  );
};
