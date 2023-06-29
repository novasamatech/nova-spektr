import { ComponentProps, useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { keyBy } from 'lodash';

import { BaseModal, HeaderTitleText, StatusLabel, Button } from '@renderer/components/ui-redesign';
import { useI18n } from '@renderer/context/I18nContext';
import { useMatrix } from '@renderer/context/MatrixContext';
import { useAccount } from '@renderer/services/account/accountService';
import { createMultisigAccount, MultisigAccount, Account } from '@renderer/domain/account';
import { useToggle } from '@renderer/shared/hooks';
import { OperationResult } from '@renderer/components/common/OperationResult/OperationResult';
import { MatrixModal } from '../MatrixModal/MatrixModal';
import { useChains } from '@renderer/services/network/chainsService';
import { ChainsRecord } from '@renderer/components/layout/PrimaryLayout/Wallets/common/types';
import { Wallet } from '@renderer/domain/wallet';
import { Contact } from '@renderer/domain/contact';
import { useWallet } from '@renderer/services/wallet/walletService';
import { useContact } from '@renderer/services/contact/contactService';
import { ExtendedContact, ExtendedWallet } from './common/types';
import { SelectSignatories, ConfirmSignatories, WalletForm } from './components';
import Paths from '@renderer/routes/paths';

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
  const { getChainsData } = useChains();
  const { getWallets } = useWallet();
  const { getContacts } = useContact();
  const { getAccounts, addAccount, setActiveAccount } = useAccount();
  const navigate = useNavigate();

  const [isLoading, toggleLoading] = useToggle();
  const [isResultModalOpen, toggleResultModal] = useToggle();

  const [name, setName] = useState('');
  const [error, setError] = useState('');
  const [activeStep, setActiveStep] = useState<Step>(Step.INIT);

  const [chains, setChains] = useState<ChainsRecord>({});
  const [signatoryWallets, setSignatoryWallets] = useState<ExtendedWallet[]>([]);
  const [signatoryContacts, setSignatoryContacts] = useState<ExtendedContact[]>([]);

  const [wallets, setWallets] = useState<Wallet[]>([]);
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [contacts, setContacts] = useState<Contact[]>([]);

  const signatories = signatoryWallets.concat(signatoryContacts);

  useEffect(() => {
    if (!isOpen) return;

    getChainsData().then((chainsData) => setChains(keyBy(chainsData, 'chainId')));
    getAccounts().then(setAccounts);
    getContacts().then(setContacts);
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
    navigate(Paths.BALANCES);
  };

  const onCreateAccount = async (name: string, threshold: number) => {
    setName(name);
    toggleLoading();
    toggleResultModal();

    const inviter = signatories.find((s) => s.matrixId === matrix.userId);
    if (!inviter || !threshold) return;

    const mstAccount = createMultisigAccount({
      name,
      signatories,
      threshold,
      creatorAccountId: inviter.accountId,
      matrixRoomId: '',
      isActive: false,
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
      await addAccount<MultisigAccount>({ ...mstAccount, matrixRoomId }).then(setActiveAccount);

      toggleLoading();
      setTimeout(handleSuccessClose, 2000);
    } catch (error: any) {
      toggleLoading();
      setError(error?.message || t('createMultisigAccount.errorMessage'));
    }

    handleClose();
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
          chains={chains}
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
          chains={chains}
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
