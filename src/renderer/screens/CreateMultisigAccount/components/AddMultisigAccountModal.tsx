import { useState } from 'react';
import { SubmitHandler } from 'react-hook-form';
import { useNavigate } from 'react-router-dom';

import { BaseModal, HeaderTitleText, StatusLabel } from '@renderer/components/ui-redesign';
import { useI18n } from '@renderer/context/I18nContext';
import { useMatrix } from '@renderer/context/MatrixContext';
import { useAccount } from '@renderer/services/account/accountService';
import { MultisigAccountForm, WalletForm } from '@renderer/screens/CreateMultisigAccount/components/WalletForm';
import { Signatory } from '@renderer/domain/signatory';
import AddSignatory from '@renderer/screens/CreateMultisigAccount/components/AddSignatory';
import Settings from '@renderer/screens/Settings';
import { createMultisigAccount, MultisigAccount } from '@renderer/domain/account';
import { useToggle } from '@renderer/shared/hooks';
import OperationResult from '@renderer/components/ui-redesign/OperationResult/OperationResult';

type Props = {
  isOpen: boolean;
  onClose: () => void;
};

export const AddMultisigAccountModal = ({ isOpen, onClose }: Props) => {
  const { t } = useI18n();
  const { matrix, isLoggedIn } = useMatrix();
  const { getLiveAccounts, addAccount } = useAccount();
  const accounts = getLiveAccounts();
  const navigate = useNavigate();

  const [isEditing, toggleIsEditing] = useToggle(true);
  const [isResultModlaOpen, toggleResultModal] = useToggle();
  const [error, setError] = useState('');
  const [name, setName] = useState('');

  const [signatories, setSignatories] = useState<Signatory[]>([]);

  if (!isLoggedIn) {
    return (
      <Settings.Matrix
        title={<h1 className="font-semibold text-2xl text-neutral"> {t('createMultisigAccount.title')}</h1>}
      />
    );
  }

  const goBack = () => {
    if (!isEditing) {
      toggleIsEditing();
    } else {
      navigate(-1);
    }
  };

  const onCreateAccount: SubmitHandler<MultisigAccountForm> = async ({ name, threshold }) => {
    setName(name);

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

      toggleResultModal();
      setTimeout(toggleResultModal, 2000);
    } catch (error: any) {
      setError(error?.message || t('createMultisigAccount.errorMessage'));
    }
  };

  const modalTitle = (
    <div className="flex justify-between px-5 py-3 w-1/2 bg-white">
      <HeaderTitleText className="py-[3px]">{t('createMultisigAccount.title')}</HeaderTitleText>
      <StatusLabel title={matrix.userId || ''} variant="success" />
    </div>
  );

  return (
    <>
      <BaseModal
        isOpen={isOpen}
        title={modalTitle}
        closeButton
        headerClass="bg-input-background-disabled"
        panelClass="w-[944px] h-[576px]"
        contentClass="flex h-[524px]"
        onClose={onClose}
      >
        <WalletForm
          signatories={signatories}
          accounts={accounts}
          isEditing={isEditing}
          onContinue={toggleIsEditing}
          onGoBack={goBack}
          onCreateAccount={onCreateAccount}
        />
        <AddSignatory isEditing={isEditing} onSelect={setSignatories} />
      </BaseModal>

      <OperationResult
        variant={error ? 'error' : 'success'}
        title={name}
        isOpen={isResultModlaOpen}
        description={!error ? t('createMultisigAccount.successMessage') : undefined}
        onClose={toggleResultModal}
      />
    </>
  );
};
