import { useGate, useUnit } from 'effector-react';
import { useEffect } from 'react';

import { type Asset, type Chain, type OngoingReferendum } from '@/shared/core';
import { useI18n } from '@/shared/i18n';
import { useModalClose } from '@/shared/lib/hooks';
import { Step, isStep } from '@/shared/lib/utils';
import { Button } from '@/shared/ui';
import { Modal } from '@/shared/ui-kit';
import { basketUtils } from '@/entities/basket';
import { OperationTitle } from '@/entities/chain';
import { OperationResult, transactionService } from '@/entities/transaction';
import { InitiateDraftButton } from '@/features/drafts';
import { networkSelectorModel } from '@/features/governance';
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
  onSuccess?: VoidFunction;
};

export const VoteModal = ({ referendum, asset, chain, onClose, onSuccess }: Props) => {
  const { t } = useI18n();

  useGate(voteModal.gates.flow, { type: 'vote', referendum });

  const step = useUnit(voteModal.$step);
  const voteSuccess = useUnit(voteModal.$voteSuccess);
  const initiatorWallet = useUnit(voteForm.$initiatorWallet);
  const tx = useUnit(voteForm.$tx);
  const chainApi = useUnit(networkSelectorModel.$governanceChainApi);
  const draftCallData = transactionService.getCallDataHex(tx, chainApi);

  const [isModalOpen, closeModal] = useModalClose(step !== Step.NONE, onClose);
  const [isBasketModalOpen, closeBasketModal] = useModalClose(step === Step.BASKET, onClose);

  useEffect(() => {
    if (voteSuccess) {
      onSuccess?.();
    }
  }, [voteSuccess]);

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
    <Modal isOpen={isModalOpen} size="md" height="fit" onToggle={onClose}>
      <Modal.Title close>
        <OperationTitle title={t('governance.voting.voteTitle')} chainId={chain.chainId}></OperationTitle>
      </Modal.Title>
      <Modal.Content>
        <section className="flex h-full min-h-0 shrink flex-col overflow-y-auto">
          {isStep(step, Step.INIT) && <VoteForm chain={chain} asset={asset} />}
          {isStep(step, Step.CONFIRM) && (
            <VoteConfirmation
              secondaryActionButton={
                <>
                  {initiatorWallet && basketUtils.isBasketAvailable(initiatorWallet) && (
                    <Button pallet="secondary" onClick={() => voteModal.events.txSaved()}>
                      {t('operation.addToBasket')}
                    </Button>
                  )}
                  <InitiateDraftButton callData={draftCallData} chainId={chain.chainId} source="governance.vote" />
                </>
              }
              onGoBack={() => voteModal.events.setStep(Step.INIT)}
            />
          )}
          {isStep(step, Step.SIGN) && <OperationSign onGoBack={() => voteModal.events.setStep(Step.CONFIRM)} />}
        </section>
      </Modal.Content>
    </Modal>
  );
};
