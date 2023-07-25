import { ComponentProps, useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';

import { BaseModal, HeaderTitleText, StatusLabel, Button } from '@renderer/shared/ui';
import { useI18n, useMatrix, Paths } from '@renderer/app/providers';
import { useAccount } from '@renderer/entities/account/lib/accountService';
import {
  createMultisigAccount,
  MultisigAccount,
  Account,
  getMultisigAccountId,
} from '@renderer/entities/account/model/account';
import { useToggle } from '@renderer/shared/lib/hooks';
import { OperationResult } from '@renderer/entities/transaction/ui/OperationResult/OperationResult';
import { MatrixModal } from '../MatrixModal/MatrixModal';
import { Wallet } from '@renderer/entities/wallet/model/wallet';
import { useWallet } from '@renderer/entities/wallet/lib/walletService';
import { useContact } from '@renderer/entities/contact/lib/contactService';
import { ExtendedContact, ExtendedWallet } from './common/types';
import { SelectSignatories, ConfirmSignatories, WalletForm } from './components';
import { AccountId } from '@renderer/domain/shared-kernel';

type OperationResultProps = Pick<ComponentProps<typeof OperationResult>, 'variant' | 'description'>;

const enum Step {
  INIT,
  CONFIRMATION,
}

type Props = {
  isOpen: boolean;
  onClose: () => void;
};

export const CreateMultisigAccount = ({ isOpen, onClose }: Props) => {
  const { t } = useI18n();
  const { matrix, isLoggedIn } = useMatrix();
  const { getWallets } = useWallet();
  const { getLiveContacts } = useContact();
  const { getAccounts, addAccount, setActiveAccount } = useAccount();
  const navigate = useNavigate();

  const [isLoading, toggleLoading] = useToggle();
  const [isResultModalOpen, toggleResultModal] = useToggle();

  const [name, setName] = useState('');
  const [error, setError] = useState('');
  const [activeStep, setActiveStep] = useState<Step>(Step.INIT);

  const [signatoryWallets, setSignatoryWallets] = useState<ExtendedWallet[]>([]);
  const [signatoryContacts, setSignatoryContacts] = useState<ExtendedContact[]>([]);

  const [wallets, setWallets] = useState<Wallet[]>([]);
  const [accounts, setAccounts] = useState<Account[]>([]);

  const contacts = getLiveContacts();
  const signatories = signatoryWallets.concat(signatoryContacts);

  useEffect(() => {
    if (!isOpen) return;

    getAccounts().then(setAccounts);
    getWallets().then(setWallets);
  }, [isOpen]);

  const goToPrevStep = () => {
    if (activeStep === Step.INIT) {
      onClose();
    } else {
      setActiveStep((prev) => prev - 1);
    }
  };

  const handleSuccessClose = () => {
    toggleResultModal();
    navigate(Paths.ASSETS);
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

      setTimeout(handleSuccessClose, 2000);
    } catch (error: any) {
      setError(error?.message || t('createMultisigAccount.errorMessage'));
    }

    toggleLoading();
    handleClose();
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

    await addAccount<MultisigAccount>(mstAccount).then(setActiveAccount);
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

    await addAccount<MultisigAccount>({ ...mstAccount, matrixRoomId }).then(setActiveAccount);
  };

  const getResultProps = (): OperationResultProps => {
    if (isLoading) return { variant: 'loading' };
    if (error) return { variant: 'error', description: error };

    return { variant: 'success', description: t('createMultisigAccount.successMessage') };
  };

  // TODO: use modal navigation
  const handleClose = () => {
    onClose();
    setActiveStep(Step.INIT);
    setSignatoryWallets([]);
    setSignatoryContacts([]);
  };

  const modalTitle = (
    <div className="flex justify-between items-center px-5 py-3 w-[472px] bg-white rounded-tl-lg">
      <HeaderTitleText className="py-[3px]">{t('createMultisigAccount.title')}</HeaderTitleText>
      <StatusLabel title={matrix.userId || ''} variant="success" />
    </div>
  );

  return (
    <>
      <BaseModal
        closeButton
        title={modalTitle}
        isOpen={isOpen && !isResultModalOpen}
        headerClass="bg-input-background-disabled"
        panelClass="w-[944px] h-[576px]"
        contentClass="flex h-[524px]"
        onClose={handleClose}
      >
        <WalletForm
          accounts={accounts}
          signatories={signatories}
          isEditState={activeStep === Step.INIT}
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
      </BaseModal>

      <OperationResult {...getResultProps()} title={name} isOpen={isResultModalOpen} onClose={handleSuccessClose}>
        {error && <Button onClick={toggleResultModal}>{t('createMultisigAccount.closeButton')}</Button>}
      </OperationResult>

      <MatrixModal isOpen={isOpen && !isLoggedIn} onClose={onClose} />
    </>
  );
};
