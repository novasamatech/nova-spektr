import { ComponentProps, useState, useEffect } from 'react';
import { useGate, useUnit } from 'effector-react';

import { BaseModal, HeaderTitleText, StatusLabel, Button, IconButton } from '@shared/ui';
import { useI18n, useMatrix } from '@app/providers';
import { useToggle } from '@shared/lib/hooks';
import { OperationResult } from '@entities/transaction';
import { ExtendedAccount, ExtendedContact } from './common/types';
import { ConfirmSignatories, WalletForm } from './components';
import { contactModel } from '@entities/contact';
import { DEFAULT_TRANSITION, dictionary } from '@shared/lib/utils';
import { MatrixLoginModal } from '@widgets/MatrixModal';
import { createMultisigWalletModel } from '../../model/create-multisig-wallet-mode';
import { SelectAccountSignatories } from './components/SelectAccountSignatories';
import { walletModel } from '@entities/wallet';
import { networkModel } from '@entities/network';

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

export const SingleChainMultisigWallet = ({ isOpen, onClose, onComplete }: Props) => {
  const { t } = useI18n();

  const accounts = useUnit(createMultisigWalletModel.$availableAccounts);
  const wallets = useUnit(walletModel.$wallets);
  const contacts = useUnit(contactModel.$contacts);
  const chain = useUnit(createMultisigWalletModel.$chain);
  const chains = useUnit(networkModel.$chains);
  const isLoading = useUnit(createMultisigWalletModel.$isLoading);
  const error = useUnit(createMultisigWalletModel.$error);

  const { matrix, isLoggedIn } = useMatrix();
  useGate(createMultisigWalletModel.MatrixGate, matrix);

  const [isModalOpen, toggleIsModalOpen] = useToggle(isOpen);
  const [isResultModalOpen, toggleResultModal] = useToggle();

  const [activeStep, setActiveStep] = useState<Step>(Step.INIT);

  const [signatoryAccounts, setSignatoryAccounts] = useState<ExtendedAccount[]>([]);
  const [signatoryContacts, setSignatoryContacts] = useState<ExtendedContact[]>([]);

  const signatories = (signatoryAccounts as ExtendedContact[]).concat(signatoryContacts);

  useEffect(() => {
    createMultisigWalletModel.events.callbacksChanged({ onComplete });
  }, [onComplete]);

  useEffect(() => {
    if (isOpen && !isModalOpen) {
      toggleIsModalOpen();
    }

    if (!isOpen && isModalOpen) {
      closeMultisigModal();
    }
  }, [isOpen]);

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

  const getResultProps = (): OperationResultProps => {
    if (isLoading) return { variant: 'loading' };
    if (error) return { variant: 'error', description: error };

    return { variant: 'success', description: t('createMultisigAccount.successMessage') };
  };

  const modalTitle = (
    <div className="flex justify-between items-center px-5 py-3 w-[464px] bg-white rounded-tl-lg">
      <HeaderTitleText className="py-[3px]">{t('createMultisigAccount.title')}</HeaderTitleText>
      {isLoggedIn && <StatusLabel title={matrix.userId || ''} variant="success" />}
    </div>
  );

  const submitHandler = (args: any) => {
    toggleResultModal();

    createMultisigWalletModel.events.walletCreated(args);
  };

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
          withChain
          onGoBack={goToPrevStep}
          onContinue={() => setActiveStep(Step.CONFIRMATION)}
          onChainChange={createMultisigWalletModel.events.chainSelected}
          onSubmit={submitHandler}
        />

        <section className="relative flex flex-col px-5 py-4 flex-1 bg-input-background-disabled h-full">
          <IconButton
            name="close"
            size={20}
            className="absolute right-3 -top-10 m-1"
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

          <ConfirmSignatories
            isActive={activeStep === Step.CONFIRMATION}
            accounts={signatoryAccounts}
            contacts={signatoryContacts}
          />
        </section>

        <MatrixLoginModal isOpen={!isLoggedIn} zIndex="z-60" onClose={closeMultisigModal} />
      </BaseModal>

      <OperationResult
        {...getResultProps()}
        title={''}
        isOpen={isModalOpen && isResultModalOpen}
        onClose={closeMultisigModal}
      >
        {error && <Button onClick={toggleResultModal}>{t('createMultisigAccount.closeButton')}</Button>}
      </OperationResult>
    </>
  );
};
