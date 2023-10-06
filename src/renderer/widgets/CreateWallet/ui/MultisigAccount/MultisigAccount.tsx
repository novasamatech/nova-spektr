import { ComponentProps, useState, useEffect } from 'react';
import { useStore } from 'effector-react';

import { BaseModal, HeaderTitleText, StatusLabel, Button } from '@renderer/shared/ui';
import { useI18n, useMatrix } from '@renderer/app/providers';
import { useToggle } from '@renderer/shared/lib/hooks';
import { OperationResult } from '@renderer/entities/transaction';
import { ExtendedContact, ExtendedWallet } from './common/types';
import { SelectSignatories, ConfirmSignatories, WalletForm } from './components';
import { contactModel } from '@renderer/entities/contact';
import { DEFAULT_TRANSITION } from '@renderer/shared/lib/utils';
import { MatrixLoginModal } from '@renderer/widgets/MatrixModal';
import type { AccountId } from '@renderer/shared/core';
import { walletModel, accountModel } from '@renderer/entities/wallet';

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

export const MultisigAccount = ({ isOpen, onClose, onComplete }: Props) => {
  const { t } = useI18n();
  const wallets = useStore(walletModel.$wallets);
  const accounts = useStore(accountModel.$accounts);
  const contacts = useStore(contactModel.$contacts);

  const { matrix, isLoggedIn } = useMatrix();

  const [isLoading, toggleLoading] = useToggle();
  const [isModalOpen, toggleIsModalOpen] = useToggle(isOpen);
  const [isResultModalOpen, toggleResultModal] = useToggle();

  const [name, setName] = useState('');
  const [error, setError] = useState('');
  const [activeStep, setActiveStep] = useState<Step>(Step.INIT);

  const [signatoryWallets, setSignatoryWallets] = useState<ExtendedWallet[]>([]);
  const [signatoryContacts, setSignatoryContacts] = useState<ExtendedContact[]>([]);

  const signatories = signatoryWallets.concat(signatoryContacts);

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

  const onCreateAccount = async (name: string, threshold: number, creatorId: AccountId): Promise<void> => {
    setName(name);
    toggleLoading();
    toggleResultModal();

    try {
      const multisigAccountId = getMultisigAccountId(
        signatories.map((s) => s.accountId),
        threshold,
      );

      const roomId = matrix.joinedRooms(multisigAccountId)[0]?.roomId;
      if (roomId) {
        await createFromExistingRoom(name, threshold, creatorId, roomId);
      } else {
        await createNewRoom(name, threshold, creatorId);
      }
    } catch (error: any) {
      setError(error?.message || t('createMultisigAccount.errorMessage'));
    }

    toggleLoading();
    setTimeout(() => closeMultisigModal({ complete: true }), 2000);
  };

  const createFromExistingRoom = async (
    name: string,
    threshold: number,
    creatorId: AccountId,
    matrixRoomId: string,
  ): Promise<void> => {
    console.log('Trying to create Multisig from existing room ', matrixRoomId);

    const mstAccount = createMultisigAccount({
      name,
      signatories,
      threshold,
      matrixRoomId,
      creatorAccountId: creatorId,
      isActive: false,
    });

    await addAccount(mstAccount).then(setActiveAccount);
  };

  const createNewRoom = async (name: string, threshold: number, creatorId: AccountId): Promise<void> => {
    console.log('Trying to create new Multisig room');

    const mstAccount = createMultisigAccount({
      name,
      signatories,
      threshold,
      matrixRoomId: '',
      creatorAccountId: creatorId,
      isActive: false,
    });

    const matrixRoomId = await matrix.createRoom({
      creatorAccountId: creatorId,
      accountName: mstAccount.name,
      accountId: mstAccount.accountId,
      threshold: mstAccount.threshold,
      signatories: signatories.map(({ accountId, matrixId }) => ({ accountId, matrixId })),
    });

    await addAccount({ ...mstAccount, matrixRoomId }).then(setActiveAccount);
  };

  const getResultProps = (): OperationResultProps => {
    if (isLoading) return { variant: 'loading' };
    if (error) return { variant: 'error', description: error };

    return { variant: 'success', description: t('createMultisigAccount.successMessage') };
  };

  const modalTitle = (
    <div className="flex justify-between items-center px-5 py-3 w-[472px] bg-white rounded-tl-lg">
      <HeaderTitleText className="py-[3px]">{t('createMultisigAccount.title')}</HeaderTitleText>
      {isLoggedIn && <StatusLabel title={matrix.userId || ''} variant="success" />}
    </div>
  );

  return (
    <>
      <BaseModal
        closeButton
        title={modalTitle}
        isOpen={isModalOpen && !isResultModalOpen}
        headerClass="bg-input-background-disabled"
        panelClass="w-[944px] h-[576px]"
        contentClass="flex h-[524px]"
        onClose={closeMultisigModal}
      >
        <WalletForm
          isActive={activeStep === Step.INIT}
          accounts={accounts}
          signatories={signatories}
          isLoading={isLoading}
          onGoBack={goToPrevStep}
          onContinue={() => setActiveStep(Step.CONFIRMATION)}
          onCreateAccount={onCreateAccount}
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

        <MatrixLoginModal isOpen={!isLoggedIn} zIndex="z-60" onClose={closeMultisigModal} />
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
