import { type ApiPromise } from '@polkadot/api';
import { useGate, useUnit } from 'effector-react';
import { useEffect, useState } from 'react';

import { useI18n } from '@app/providers';
import { type AccountVote, type Address, type Asset, type Chain, type ReferendumId, type TrackId } from '@/shared/core';
import { useModalClose } from '@/shared/lib/hooks';
import { Step, isStep, nonNullable, nullable } from '@/shared/lib/utils';
import { BaseModal, Button } from '@shared/ui';
import { OperationTitle } from '@/entities/chain';
import { SignButton } from '@/entities/operations';
import { OperationResult, TransactionSlider } from '@/entities/transaction';
import { OperationSign, OperationSubmit } from '@/features/operations';
import { RemoveVoteConfirmation, basketUtils, removeVoteConfirmModel } from '@/features/operations/OperationsConfirm';
import { SignatorySelectModal } from '@/pages/Operations/components/modals/SignatorySelectModal';
import { removeVotesModalAggregate } from '../aggregates/removeVotesModal';

type Props = {
  votes: {
    voter: Address;
    referendum: ReferendumId;
    track: TrackId;
    vote?: AccountVote;
  }[];
  api: ApiPromise;
  chain: Chain;
  asset: Asset;
  onClose: VoidFunction;
};

export const RemoveVotesModal = ({ votes, chain, asset, api, onClose }: Props) => {
  useGate(removeVotesModalAggregate.gates.flow, {
    votes,
    chain,
    asset,
    api,
  });

  const { t } = useI18n();
  const step = useUnit(removeVotesModalAggregate.$step);
  const signatory = useUnit(removeVotesModalAggregate.$signatory);
  const signatories = useUnit(removeVotesModalAggregate.$signatories);
  const initiatorWallet = useUnit(removeVotesModalAggregate.$initiatorWallet);
  const votesList = useUnit(removeVotesModalAggregate.$votesList);

  const shouldPickSignatory = nullable(signatory) && signatories.length > 0;

  const [isModalOpen, closeModal] = useModalClose(!isStep(step, Step.NONE), onClose);
  const [isBasketModalOpen, closeBasketModal] = useModalClose(isStep(step, Step.BASKET), onClose);
  const [isSelectSignatoryOpen, setIsSelectSignatoryOpen] = useState(shouldPickSignatory);
  const [isSelectSignatoryClosed, setIsSelectSignatoryClosed] = useState(false);

  const handleSelectSignatoryClose = () => {
    setIsSelectSignatoryOpen(false);
    setIsSelectSignatoryClosed(true);
  };

  useEffect(() => {
    if (shouldPickSignatory) {
      if (isSelectSignatoryClosed) {
        closeModal();
      } else {
        setIsSelectSignatoryOpen(true);
      }
    }
  }, [shouldPickSignatory, isSelectSignatoryClosed, isSelectSignatoryClosed, setIsSelectSignatoryOpen, closeModal]);

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
    <>
      <BaseModal
        isOpen={isModalOpen}
        closeButton
        title={
          <OperationTitle title={t('operations.modalTitles.removeVoteOn')} chainId={chain.chainId}></OperationTitle>
        }
        headerClass="px-5 py-3"
        panelClass="flex flex-col w-fit max-h-[678px]"
        contentClass="flex flex-col h-full min-h-0 overflow-y-auto shrink"
        onClose={onClose}
      >
        {isStep(step, Step.CONFIRM) && votesList.length === 1 && (
          <RemoveVoteConfirmation
            hideSignButton={shouldPickSignatory}
            secondaryActionButton={
              !shouldPickSignatory &&
              nonNullable(initiatorWallet) &&
              basketUtils.isBasketAvailable(initiatorWallet) && (
                <Button pallet="secondary" onClick={() => removeVotesModalAggregate.events.txSaved()}>
                  {t('operation.addToBasket')}
                </Button>
              )
            }
          />
        )}

        {isStep(step, Step.CONFIRM) && votesList.length > 1 && (
          <TransactionSlider
            footer={
              <div className="flex gap-2">
                {initiatorWallet && basketUtils.isBasketAvailable(initiatorWallet) && (
                  <Button pallet="secondary" onClick={() => removeVotesModalAggregate.events.txSaved()}>
                    {t('operation.addToBasket')}
                  </Button>
                )}
                <SignButton isDefault type={initiatorWallet?.type} onClick={removeVoteConfirmModel.events.sign} />
              </div>
            }
            count={votesList.length}
          >
            {votesList.map((_, index) => (
              <div key={index} className="flex h-[582px] flex-col last-of-type:pr-4">
                <div className="max-h-full w-[440px] overflow-y-auto rounded-lg bg-white shadow-shadow-2">
                  <RemoveVoteConfirmation id={index} hideSignButton />
                </div>
              </div>
            ))}
          </TransactionSlider>
        )}

        {isStep(step, Step.SIGN) && (
          <OperationSign onGoBack={() => removeVotesModalAggregate.events.setStep(Step.CONFIRM)} />
        )}
      </BaseModal>

      <SignatorySelectModal
        isOpen={isSelectSignatoryOpen}
        accounts={signatories}
        chain={chain}
        nativeAsset={asset}
        onClose={handleSelectSignatoryClose}
        onSelect={(a) => {
          removeVotesModalAggregate.events.selectSignatory(a);
          setIsSelectSignatoryOpen(false);
        }}
      />
    </>
  );
};
