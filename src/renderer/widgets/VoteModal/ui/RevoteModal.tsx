import { useGate, useUnit } from 'effector-react';

import { type AccountVote, type Address, type Asset, type Chain, type OngoingReferendum } from '@/shared/core';
import { useI18n } from '@/shared/i18n';
import { useModalClose } from '@/shared/lib/hooks';
import { Step, isStep } from '@/shared/lib/utils';
import { BaseModal, Button } from '@/shared/ui';
import { OperationTitle } from '@/entities/chain';
import { OperationResult } from '@/entities/transaction';
import { OperationSign, OperationSubmit } from '@/features/operations';
import { VoteConfirmation, basketUtils } from '@/features/operations/OperationsConfirm';
import { voteModalAggregate } from '../aggregates/voteModal';

import { VoteForm } from './VoteForm';

type Props = {
  referendum: OngoingReferendum;
  votes: { voter: Address; vote: AccountVote }[];
  chain: Chain;
  asset: Asset;
  onClose: VoidFunction;
};

export const RevoteModal = ({ referendum, votes, asset, chain, onClose }: Props) => {
  useGate(voteModalAggregate.gates.flow, { referendum, votes });

  const { t } = useI18n();
  const step = useUnit(voteModalAggregate.$step);
  const initiatorWallet = useUnit(voteModalAggregate.accounts.$initiatorWallet);

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
              <Button pallet="secondary" onClick={() => voteModalAggregate.events.txSaved()}>
                {t('operation.addToBasket')}
              </Button>
            )
          }
          onGoBack={() => voteModalAggregate.events.setStep(Step.INIT)}
        />
      )}
      {isStep(step, Step.SIGN) && <OperationSign onGoBack={() => voteModalAggregate.events.setStep(Step.CONFIRM)} />}
    </BaseModal>
  );
};
