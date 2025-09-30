import { useUnit } from 'effector-react';
import React, { useEffect, useState } from 'react';

import { type Asset, type Chain } from '@/shared/core';
import { useI18n } from '@/shared/i18n';
import { useModalClose } from '@/shared/lib/hooks';
import { Step, isStep, nonNullable, nullable } from '@/shared/lib/utils';
import { Button } from '@/shared/ui';
import { AccountSelectModal, TransactionValidationError } from '@/shared/ui-entities';
import { Modal } from '@/shared/ui-kit';
import { type AnyAccount } from '@/domains/network';
import { basketUtils } from '@/entities/basket';
import { OperationTitle } from '@/entities/chain';
import { OperationResult } from '@/entities/transaction';
import { walletModel, walletUtils } from '@/entities/wallet';
import { walletSelect } from '@/aggregates/wallet-select';
import { SignatorySelectModal } from '@/features/multisig-operations';
import { OperationSign, OperationSubmit } from '@/features/operations';
import { RemoveVoteConfirmation } from '@/features/operations/OperationsConfirm';
import { removeVotesModel } from '../model/removeVotesModal';

type Props = {
  /**
   * Adds account select in case of multiple votes with different accounts.
   */
  single?: boolean;
  chain: Chain;
  asset: Asset;
  onClose: VoidFunction;
};

export const RemoveVotesDefaultModal = ({ single, chain, asset, onClose }: Props) => {
  const { t } = useI18n();
  const step = useUnit(removeVotesModel.$step);
  const initiatorWallet = useUnit(removeVotesModel.$initiatorWallet);
  const votesList = useUnit(removeVotesModel.$votesList);
  const errors = useUnit(removeVotesModel.$errors);
  const valid = useUnit(removeVotesModel.$valid);
  const wallets = useUnit(walletModel.$wallets);

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
      <Modal isOpen={isModalOpen} size="md" height="fit" onToggle={onClose}>
        <Modal.Title close>
          <OperationTitle title={t('operations.modalTitles.removeVoteOn')} chainId={chain.chainId}></OperationTitle>
        </Modal.Title>
        <Modal.Content>
          <TransactionValidationError errors={errors} wallets={wallets} />
          {isStep(step, Step.CONFIRM) && votesList.length === 1 && (
            <RemoveVoteConfirmation
              secondaryActionButton={
                nonNullable(initiatorWallet) &&
                basketUtils.isBasketAvailable(initiatorWallet) && (
                  <Button pallet="secondary" disabled={!valid} onClick={() => removeVotesModel.events.txSaved()}>
                    {t('operation.addToBasket')}
                  </Button>
                )
              }
            />
          )}

          {isStep(step, Step.SIGN) && <OperationSign onGoBack={() => removeVotesModel.events.setStep(Step.CONFIRM)} />}
        </Modal.Content>
      </Modal>

      <VoteSignatorySelect
        asset={asset}
        chain={chain}
        onSelect={removeVotesModel.events.selectSignatory}
        onCancel={closeModal}
      />

      {single ? (
        <VoteAccountSelect
          asset={asset}
          chain={chain}
          onSelect={removeVotesModel.events.selectAccount}
          onCancel={closeModal}
        />
      ) : null}
    </>
  );
};

type SignatoryProps = {
  chain: Chain;
  asset: Asset;
  onSelect: (signatory: AnyAccount) => void;
  onCancel: VoidFunction;
};

const VoteSignatorySelect = ({ chain, asset, onSelect, onCancel }: SignatoryProps) => {
  const signatory = useUnit(removeVotesModel.$signatory);
  const signatories = useUnit(removeVotesModel.$signatories);
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
  onSelect: (signatory: AnyAccount) => void;
  onCancel: VoidFunction;
};

const VoteAccountSelect = ({ asset, chain, onCancel, onSelect }: AccountProps) => {
  const { t } = useI18n();

  const account = useUnit(removeVotesModel.$pickedAccount);
  const accounts = useUnit(removeVotesModel.$availableAccounts);
  const wallet = useUnit(walletSelect.$selectedWallet);

  const shouldPickAccount = nullable(account) && accounts.length > 1 && !walletUtils.isFlexibleMultisig(wallet);
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
