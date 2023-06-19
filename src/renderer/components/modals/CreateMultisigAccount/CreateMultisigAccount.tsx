import { ComponentProps, useState } from 'react';
import { SubmitHandler } from 'react-hook-form';

import { BaseModal, HeaderTitleText, StatusLabel } from '@renderer/components/ui-redesign';
import { useI18n } from '@renderer/context/I18nContext';
import { useMatrix } from '@renderer/context/MatrixContext';
import { useAccount } from '@renderer/services/account/accountService';
import { Signatory } from '@renderer/domain/signatory';
import { createMultisigAccount, MultisigAccount } from '@renderer/domain/account';
import { useToggle } from '@renderer/shared/hooks';
import OperationResult from '@renderer/components/ui-redesign/OperationResult/OperationResult';
import { MultisigAccountForm, WalletForm } from './components/WalletForm';
import AddSignatory from './components/AddSignatory';
import MatrixModal from '@renderer/components/modals/MatrixModal/MatrixModal';

type OperationResultProps = Pick<ComponentProps<typeof OperationResult>, 'variant' | 'description'>;

type Props = {
  isOpen: boolean;
  onClose: () => void;
};

const CreateMultisigAccount = ({ isOpen, onClose }: Props) => {
  const { t } = useI18n();
  const { matrix, isLoggedIn } = useMatrix();
  const { getLiveAccounts, addAccount } = useAccount();
  const accounts = getLiveAccounts();

  const [isEditing, toggleIsEditing] = useToggle(true);
  const [isResultModlaOpen, toggleResultModal] = useToggle();
  const [isLoading, toggleLoading] = useToggle();
  const [error, setError] = useState('');
  const [name, setName] = useState('');

  const [signatories, setSignatories] = useState<Signatory[]>([]);

  const goBack = () => {
    if (!isEditing) {
      toggleIsEditing();
    } else {
      onClose();
    }
  };

  const onCreateAccount: SubmitHandler<MultisigAccountForm> = async ({ name, threshold }) => {
    setName(name);
    toggleLoading();
    toggleResultModal();

    const inviter = signatories.find((s) => s.matrixId === matrix.userId);
    if (!inviter || !threshold) return;

    const mstAccount = createMultisigAccount({
      name,
      signatories,
      threshold: threshold.value,
      creatorAccountId: inviter.accountId,
      matrixRoomId: '',
    });

    if (!mstAccount.accountId) return;

    try {
      const matrixRoomId = await matrix.createRoom({
        creatorAccountId: inviter.accountId,
        accountName: mstAccount.name,
        accountId: mstAccount.accountId,
        threshold: mstAccount.threshold,
        signatories: signatories.map(({ accountId, matrixId }) => ({ accountId, matrixId })),
      });
      await addAccount<MultisigAccount>({ ...mstAccount, matrixRoomId });

      toggleLoading();
      setTimeout(toggleResultModal, 2000);
    } catch (error: any) {
      toggleLoading();
      setError(error?.message || t('createMultisigAccount.errorMessage'));
    }

    // reset back to initial state
    toggleIsEditing();
    setSignatories([]);
    onClose();
  };

  const modalTitle = (
    <div className="flex justify-between items-center px-5 py-3 w-[472px] bg-white rounded-tl-lg">
      <HeaderTitleText className="py-[3px]">{t('createMultisigAccount.title')}</HeaderTitleText>
      <StatusLabel title={matrix.userId || ''} variant="success" />
    </div>
  );

  const getResultProps = (): OperationResultProps => {
    if (isLoading) return { variant: 'loading' };
    if (error) return { variant: 'error', description: error };

    return { variant: 'success', description: t('createMultisigAccount.successMessage') };
  };

  return (
    <>
      <BaseModal
        closeButton
        title={modalTitle}
        isOpen={isOpen && !isResultModlaOpen}
        headerClass="bg-input-background-disabled"
        panelClass="w-[944px] h-[576px]"
        contentClass="flex h-[524px]"
        onClose={onClose}
      >
        <WalletForm
          signatories={signatories}
          accounts={accounts}
          isEditing={isEditing}
          isLoading={isLoading}
          onContinue={toggleIsEditing}
          onGoBack={goBack}
          onCreateAccount={onCreateAccount}
        />
        <AddSignatory isEditing={isEditing} onSelect={setSignatories} />
      </BaseModal>

      <OperationResult {...getResultProps()} title={name} isOpen={isResultModlaOpen} onClose={toggleResultModal} />
      <MatrixModal isOpen={isOpen && !isLoggedIn} onClose={onClose} />
    </>
  );
};

export default CreateMultisigAccount;
