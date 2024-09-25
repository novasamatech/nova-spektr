import { useUnit } from 'effector-react';
import noop from 'lodash/noop';
import { type ComponentProps, useEffect, useState } from 'react';

import { useI18n } from '@app/providers';
import { type HexString } from '@shared/core';
import { useToggle } from '@shared/lib/hooks';
import { DEFAULT_TRANSITION, dictionary } from '@shared/lib/utils';
import { BaseModal, Button, HeaderTitleText, IconButton } from '@shared/ui';
import { contactModel } from '@entities/contact';
import { networkModel } from '@entities/network';
import { OperationResult } from '@entities/transaction';
import { walletModel } from '@entities/wallet';
import { createMultisigWalletModel } from '../../model/create-multisig-wallet-model';

import { type ExtendedAccount, type ExtendedContact } from './common/types';
import { ConfirmSignatories, WalletForm } from './components';
import { SelectAccountSignatories } from './components/SelectAccountSignatories';

type OperationResultProps = Pick<ComponentProps<typeof OperationResult>, 'variant' | 'description'>;

const enum Step {
  INIT,
  CONFIRMATION,
}

type Props = {
  isOpen: boolean;
  onClose: () => void;
  onComplete: () => void;
  onBack: () => void;
};

export const SingleChainMultisigWallet = ({ isOpen, onClose, onComplete, onBack }: Props) => {
  const { t } = useI18n();

  const accounts = useUnit(createMultisigWalletModel.$availableAccounts);
  const wallets = useUnit(walletModel.$wallets);
  const contacts = useUnit(contactModel.$contacts);
  const chain = useUnit(createMultisigWalletModel.$chain);
  const chains = useUnit(networkModel.$chains);
  const isLoading = useUnit(createMultisigWalletModel.$isLoading);
  const error = useUnit(createMultisigWalletModel.$error);

  const [isModalOpen, toggleIsModalOpen] = useToggle(isOpen);
  const [isResultModalOpen, toggleResultModal] = useToggle();

  const [activeStep, setActiveStep] = useState<Step>(Step.INIT);
  const [name, setName] = useState('');

  const [signatoryAccounts, setSignatoryAccounts] = useState<ExtendedAccount[]>([]);
  const [signatoryContacts, setSignatoryContacts] = useState<ExtendedContact[]>([]);

  const signatories = (signatoryAccounts as ExtendedContact[]).concat(signatoryContacts);

  useEffect(() => {
    createMultisigWalletModel.events.signatoriesChanged(signatories);
  }, [signatories.length]);

  useEffect(() => {
    createMultisigWalletModel.events.callbacksChanged({ onComplete });
  }, [onComplete]);

  useEffect(() => {
    if (isOpen && !isModalOpen) {
      toggleIsModalOpen();
    }

    if (!isOpen && isModalOpen) {
      closeMultisigModal({ closeAll: false });
    }
  }, [isOpen]);

  const goToPrevStep = () => {
    if (activeStep === Step.INIT) {
      onBack();
    } else {
      setActiveStep((prev) => prev - 1);
    }
  };

  const closeMultisigModal = (params: { complete?: boolean; closeAll?: boolean } = { closeAll: true }) => {
    toggleIsModalOpen();

    setTimeout(params?.complete ? onComplete : params?.closeAll ? onClose : noop, DEFAULT_TRANSITION);
  };

  const getResultProps = (): OperationResultProps => {
    if (isLoading) {
      return { variant: 'loading' };
    }
    if (error) {
      return { variant: 'error', description: error };
    }

    return { variant: 'success', description: t('createMultisigAccount.successMessage') };
  };

  const modalTitle = (
    <div className="flex w-[464px] items-center justify-between rounded-tl-lg bg-white px-5 py-3">
      <HeaderTitleText className="py-[3px]">{t('createMultisigAccount.title')}</HeaderTitleText>
    </div>
  );

  const submitHandler = (args: { name: string; threshold: number; creatorId: HexString }) => {
    toggleResultModal();
    setName(args.name);

    createMultisigWalletModel.events.walletCreated(args);
  };

  return (
    <>
      <BaseModal
        title={modalTitle}
        isOpen={isModalOpen && !isResultModalOpen}
        headerClass="bg-input-background-disabled"
        panelClass="w-modal-xl h-modal"
        contentClass="flex h-[524px]"
        onClose={closeMultisigModal}
      >
        <WalletForm
          isActive={activeStep === Step.INIT}
          signatories={signatories}
          isLoading={isLoading}
          withChain
          onGoBack={goToPrevStep}
          onContinue={() => setActiveStep(Step.CONFIRMATION)}
          onChainChange={createMultisigWalletModel.events.chainSelected}
          onSubmit={submitHandler}
        />

        <section className="relative flex h-full flex-1 flex-col bg-input-background-disabled px-5 py-4">
          <IconButton
            name="close"
            size={20}
            className="absolute -top-10 right-3 m-1"
            onClick={() => closeMultisigModal()}
          />

          <SelectAccountSignatories
            isActive={activeStep === Step.INIT}
            accounts={accounts}
            wallets={dictionary(wallets, 'id')}
            contacts={contacts}
            chain={chains[chain!]}
            onSelect={(accounts, contacts) => {
              setSignatoryAccounts(accounts);
              setSignatoryContacts(contacts);
            }}
          />

          {activeStep === Step.CONFIRMATION && (
            <ConfirmSignatories chain={chains[chain!]} accounts={signatoryAccounts} contacts={signatoryContacts} />
          )}
        </section>
      </BaseModal>

      <OperationResult
        {...getResultProps()}
        title={name}
        isOpen={isModalOpen && isResultModalOpen}
        onClose={() => closeMultisigModal({ complete: true })}
      >
        {error && <Button onClick={toggleResultModal}>{t('createMultisigAccount.closeButton')}</Button>}
      </OperationResult>
    </>
  );
};
