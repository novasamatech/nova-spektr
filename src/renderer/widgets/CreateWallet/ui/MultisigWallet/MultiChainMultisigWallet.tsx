import { ComponentProps, useState, useEffect } from 'react';
import { useUnit } from 'effector-react';

import { BaseModal, HeaderTitleText, StatusLabel, Button, IconButton } from '@shared/ui';
import { useI18n } from '@app/providers';
import { useToggle } from '@shared/lib/hooks';
import { OperationResult } from '@entities/transaction';
import { ExtendedContact, ExtendedWallet } from './common/types';
import { SelectSignatories, ConfirmSignatories, WalletForm } from './components';
import { contactModel } from '@entities/contact';
import { DEFAULT_TRANSITION } from '@shared/lib/utils';
import { walletModel } from '@entities/wallet';
import { matrixModel, matrixUtils } from '@entities/matrix';
import { createMultisigWalletModel } from '../../model/create-multisig-wallet-model';

type OperationResultProps = Pick<ComponentProps<typeof OperationResult>, 'variant' | 'description'>;

const enum Step {
  INIT,
  CONFIRMATION,
}

type Props = {
  isOpen: boolean;
  onClose: () => void;
  onComplete: () => void;
};

export const MultiChainMultisigWallet = ({ isOpen, onClose, onComplete }: Props) => {
  const { t } = useI18n();
  const wallets = useUnit(walletModel.$wallets);
  const accounts = useUnit(walletModel.$accounts);
  const contacts = useUnit(contactModel.$contacts);

  const matrix = useUnit(matrixModel.$matrix);
  const loginStatus = useUnit(matrixModel.$loginStatus);

  const isLoading = useUnit(createMultisigWalletModel.$isLoading);
  const error = useUnit(createMultisigWalletModel.$error);

  const [isModalOpen, toggleIsModalOpen] = useToggle(isOpen);
  const [isResultModalOpen, toggleResultModal] = useToggle();

  const [name, setName] = useState('');
  const [activeStep, setActiveStep] = useState<Step>(Step.INIT);

  const [signatoryWallets, setSignatoryWallets] = useState<ExtendedWallet[]>([]);
  const [signatoryContacts, setSignatoryContacts] = useState<ExtendedContact[]>([]);

  const signatories = signatoryWallets.concat(signatoryContacts);

  useEffect(() => {
    if (isOpen && !isModalOpen) {
      toggleIsModalOpen();
      createMultisigWalletModel.events.reset();
      setName('');
    }

    if (!isOpen && isModalOpen) {
      closeMultisigModal();
    }
  }, [isOpen]);

  useEffect(() => {
    createMultisigWalletModel.events.signatoriesChanged(signatories);
  }, [signatories.length]);

  useEffect(() => {
    createMultisigWalletModel.events.callbacksChanged({ onComplete });
  }, [onComplete]);

  const goToPrevStep = () => {
    if (activeStep === Step.INIT) {
      closeMultisigModal();
    } else {
      setActiveStep((prev) => prev - 1);
    }
  };

  const closeMultisigModal = (params?: { complete: boolean }) => {
    toggleIsModalOpen();

    setTimeout(params?.complete ? onComplete : onClose, DEFAULT_TRANSITION);
  };

  const submitHandler = (args: any) => {
    toggleResultModal();
    setName(args.name);

    createMultisigWalletModel.events.walletCreated(args);
  };

  const getResultProps = (): OperationResultProps => {
    if (isLoading) return { variant: 'loading' };
    if (error) return { variant: 'error', description: error };

    return { variant: 'success', description: t('createMultisigAccount.successMessage') };
  };

  const modalTitle = (
    <div className="flex justify-between items-center px-5 py-3 w-[464px] bg-white rounded-tl-lg">
      <HeaderTitleText className="py-[3px]">{t('createMultisigAccount.title')}</HeaderTitleText>
      {matrixUtils.isLoggedIn(loginStatus) && <StatusLabel title={matrix.userId || ''} variant="success" />}
    </div>
  );

  return (
    <>
      <BaseModal
        title={modalTitle}
        isOpen={isModalOpen && !isResultModalOpen}
        headerClass="bg-input-background-disabled"
        panelClass="w-[944px] h-[576px]"
        contentClass="flex h-[524px]"
        onClose={closeMultisigModal}
      >
        <WalletForm
          isActive={activeStep === Step.INIT}
          signatories={signatories}
          isLoading={isLoading}
          onGoBack={goToPrevStep}
          onContinue={() => setActiveStep(Step.CONFIRMATION)}
          onSubmit={submitHandler}
        />

        <section className="relative flex flex-col px-5 py-4 flex-1 bg-input-background-disabled h-full">
          <IconButton
            name="close"
            size={20}
            className="absolute right-3 -top-10 m-1"
            onClick={() => closeMultisigModal()}
          />

          <SelectSignatories
            isActive={activeStep === Step.INIT}
            wallets={wallets}
            accounts={accounts}
            contacts={contacts}
            onSelect={(wallets, contacts) => {
              setSignatoryWallets(wallets);
              setSignatoryContacts(contacts);
            }}
          />

          <ConfirmSignatories
            isActive={activeStep === Step.CONFIRMATION}
            wallets={signatoryWallets}
            contacts={signatoryContacts}
          />
        </section>
      </BaseModal>

      <OperationResult
        {...getResultProps()}
        title={name}
        isOpen={isModalOpen && isResultModalOpen}
        onClose={closeMultisigModal}
      >
        {error && <Button onClick={toggleResultModal}>{t('createMultisigAccount.closeButton')}</Button>}
      </OperationResult>
    </>
  );
};
