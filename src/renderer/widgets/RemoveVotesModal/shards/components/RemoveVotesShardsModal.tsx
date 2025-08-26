import { type ApiPromise } from '@polkadot/api';
import { useGate, useUnit } from 'effector-react';

import { type AccountVote, type Asset, type Chain, type ReferendumId, type TrackId } from '@/shared/core';
import { useI18n } from '@/shared/i18n';
import { useModalClose } from '@/shared/lib/hooks';
import { Step, isStep } from '@/shared/lib/utils';
import { type AccountId } from '@/shared/polkadotjs-schemas';
import { Button } from '@/shared/ui';
import { Modal } from '@/shared/ui-kit';
import { basketUtils } from '@/entities/basket';
import { OperationTitle } from '@/entities/chain';
import { SignButton } from '@/entities/operations';
import { OperationResult } from '@/entities/transaction';
import { OperationSign, OperationSubmit } from '@/features/operations';
import { ConfirmSlider, RemoveVoteConfirmation, removeVoteConfirmModel } from '@/features/operations/OperationsConfirm';
import { removeVotesShardsModel } from '../model/removeVotesShardsModel';

type Props = {
  votes: {
    voter: AccountId;
    referendum: ReferendumId;
    track: TrackId;
    vote?: AccountVote;
  }[];
  api: ApiPromise;
  chain: Chain;
  asset: Asset;
  onClose: VoidFunction;
};

export const RemoveVotesShardsModal = ({ votes, chain, asset, api, onClose }: Props) => {
  useGate(removeVotesShardsModel.gates.flow, {
    votes,
    chain,
    asset,
    api,
  });

  const { t } = useI18n();
  const step = useUnit(removeVotesShardsModel.$step);
  const initiatorWallet = useUnit(removeVotesShardsModel.$initiatorWallet);
  const votesList = useUnit(removeVotesShardsModel.$votesList);

  const [isModalOpen, closeModal] = useModalClose(!isStep(step, Step.NONE), onClose);
  const [isBasketModalOpen, closeBasketModal] = useModalClose(isStep(step, Step.BASKET), onClose);

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
    <Modal isOpen={isModalOpen} size="fit" height="fit" onToggle={onClose}>
      <Modal.Title close>
        <OperationTitle title={t('operations.modalTitles.removeVoteOn')} chainId={chain.chainId}></OperationTitle>
      </Modal.Title>
      <Modal.Content>
        {isStep(step, Step.CONFIRM) && votesList.length > 1 && (
          <ConfirmSlider
            footer={
              <div className="flex gap-2">
                {initiatorWallet && basketUtils.isBasketAvailable(initiatorWallet) && (
                  <Button pallet="secondary" onClick={() => removeVotesShardsModel.events.txSaved()}>
                    {t('operation.addToBasket')}
                  </Button>
                )}
                <SignButton isDefault type={initiatorWallet?.type} onClick={removeVoteConfirmModel.startSigning} />
              </div>
            }
            count={votesList.length}
          >
            {votesList.map((_, index) => (
              <ConfirmSlider.Item key={index}>
                <RemoveVoteConfirmation id={index} hideSignButton />
              </ConfirmSlider.Item>
            ))}
          </ConfirmSlider>
        )}

        {isStep(step, Step.SIGN) && (
          <OperationSign onGoBack={() => removeVotesShardsModel.events.setStep(Step.CONFIRM)} />
        )}
      </Modal.Content>
    </Modal>
  );
};
