import { type ApiPromise } from '@polkadot/api';
import { useGate, useUnit } from 'effector-react';
import { useEffect, useState } from 'react';

import { useI18n } from '@app/providers';
import {
  type Account,
  type AccountVote,
  type Address,
  type Asset,
  type Chain,
  type ReferendumId,
  type TrackId,
} from '@/shared/core';
import { useModalClose } from '@/shared/lib/hooks';
import { Step, isStep, nonNullable, nullable } from '@/shared/lib/utils';
import { BaseModal, Button } from '@/shared/ui';
import { AccountSelectModal } from '@/shared/ui-entities';
import { OperationTitle } from '@/entities/chain';
import { SignButton } from '@/entities/operations';
import { OperationResult } from '@/entities/transaction';
import { OperationSign, OperationSubmit } from '@/features/operations';
import {
  ConfirmSlider,
  RemoveVoteConfirmation,
  basketUtils,
  removeVoteConfirmModel,
} from '@/features/operations/OperationsConfirm';
import { SignatorySelectModal } from '@/pages/Operations/components/modals/SignatorySelectModal';
import { removeVotesModalAggregate } from '../aggregates/removeVotesModal';

type Props = {
  single?: boolean;
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

export const RemoveVotesModal = ({ single, votes, chain, asset, api, onClose }: Props) => {
  useGate(removeVotesModalAggregate.gates.flow, {
    votes,
    chain,
    asset,
    api,
  });

  const { t } = useI18n();
  const step = useUnit(removeVotesModalAggregate.$step);
  const initiatorWallet = useUnit(removeVotesModalAggregate.$initiatorWallet);
  const votesList = useUnit(removeVotesModalAggregate.$votesList);

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
            secondaryActionButton={
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
          <ConfirmSlider
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
              <ConfirmSlider.Item key={index}>
                <RemoveVoteConfirmation id={index} hideSignButton />
              </ConfirmSlider.Item>
            ))}
          </ConfirmSlider>
        )}

        {isStep(step, Step.SIGN) && (
          <OperationSign onGoBack={() => removeVotesModalAggregate.events.setStep(Step.CONFIRM)} />
        )}
      </BaseModal>

      <VoteSignatorySelect
        asset={asset}
        chain={chain}
        onSelect={removeVotesModalAggregate.events.selectSignatory}
        onCancel={closeModal}
      />

      {single ? (
        <VoteAccountSelect
          asset={asset}
          chain={chain}
          onSelect={removeVotesModalAggregate.events.selectAccount}
          onCancel={closeModal}
        />
      ) : null}
    </>
  );
};

type SignatoryProps = {
  chain: Chain;
  asset: Asset;
  onSelect: (signatory: Account) => void;
  onCancel: VoidFunction;
};

const VoteSignatorySelect = ({ chain, asset, onSelect, onCancel }: SignatoryProps) => {
  const signatory = useUnit(removeVotesModalAggregate.$signatory);
  const signatories = useUnit(removeVotesModalAggregate.$signatories);
  const shouldPickSignatory = nullable(signatory) && signatories.length > 0;
  const [isSelectSignatoryOpen, setIsSelectSignatoryOpen] = useState(shouldPickSignatory);
  const [isSelectSignatoryClosed, setIsSelectSignatoryClosed] = useState(false);

  const handleSelectSignatoryClose = () => {
    setIsSelectSignatoryOpen(false);
    setIsSelectSignatoryClosed(true);
  };

  useEffect(() => {
    if (shouldPickSignatory) {
      if (isSelectSignatoryClosed) {
        onCancel();
      } else {
        setIsSelectSignatoryOpen(true);
      }
    }
  }, [shouldPickSignatory, isSelectSignatoryClosed, isSelectSignatoryClosed, setIsSelectSignatoryOpen, onCancel]);

  return (
    <SignatorySelectModal
      isOpen={isSelectSignatoryOpen}
      accounts={signatories}
      chain={chain}
      nativeAsset={asset}
      onClose={handleSelectSignatoryClose}
      onSelect={(a) => {
        onSelect(a);
        setIsSelectSignatoryOpen(false);
      }}
    />
  );
};

type AccountProps = {
  chain: Chain;
  asset: Asset;
  onSelect: (signatory: Account) => void;
  onCancel: VoidFunction;
};

const VoteAccountSelect = ({ asset, chain, onCancel, onSelect }: AccountProps) => {
  const { t } = useI18n();

  const account = useUnit(removeVotesModalAggregate.$pickedAccount);
  const accounts = useUnit(removeVotesModalAggregate.$availableAccounts);
  const shouldPickAccount = nullable(account) && accounts.length > 0;
  const [isSelectAccountOpen, setIsSelectAccountOpen] = useState(shouldPickAccount);
  const [isSelectAccountClosed, setIsSelectAccountClosed] = useState(false);

  const handleSelectAccountClose = () => {
    setIsSelectAccountOpen(false);
    setIsSelectAccountClosed(true);
  };

  useEffect(() => {
    if (shouldPickAccount) {
      if (isSelectAccountClosed) {
        onCancel();
      } else {
        setIsSelectAccountOpen(true);
      }
    }
  }, [shouldPickAccount, isSelectAccountClosed, isSelectAccountClosed, setIsSelectAccountOpen, onCancel]);

  return (
    <AccountSelectModal
      isOpen={isSelectAccountOpen}
      asset={asset}
      chain={chain}
      title={t('governance.voting.selectAccountTitle')}
      options={accounts.map((account) => ({ account }))}
      onSelect={(a) => {
        onSelect(a);
        setIsSelectAccountOpen(false);
      }}
      onToggle={handleSelectAccountClose}
    />
  );
};
