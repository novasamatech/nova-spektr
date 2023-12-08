import { ComponentProps, useState, useEffect } from 'react';
import { useStore } from 'effector-react';

import { BaseModal, HeaderTitleText, StatusLabel, Button, IconButton } from '@shared/ui';
import { useI18n, useMatrix } from '@app/providers';
import { useToggle } from '@shared/lib/hooks';
import { OperationResult } from '@entities/transaction';
import { ExtendedContact, ExtendedWallet } from './common/types';
import { SelectSignatories, ConfirmSignatories, WalletForm } from './components';
import { contactModel } from '@entities/contact';
import { DEFAULT_TRANSITION } from '@shared/lib/utils';
import { MatrixLoginModal } from '@widgets/MatrixModal';
import { walletModel, accountUtils } from '@entities/wallet';
import type { AccountId } from '@shared/core';
import { WalletType, SigningType, CryptoType, ChainType, AccountType } from '@shared/core';

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
  const accounts = useStore(walletModel.$accounts);
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

  const createWallet = async (name: string, threshold: number, creatorId: AccountId): Promise<void> => {
    setName(name);
    toggleLoading();
    toggleResultModal();

    try {
      const accountIds = signatories.map((s) => s.accountId);
      const accountId = accountUtils.getMultisigAccountId(accountIds, threshold);
      const roomId = matrix.joinedRooms(accountId)[0]?.roomId;

      if (roomId) {
        createFromExistingRoom({ name, accountId, threshold, creatorId, roomId });
      } else {
        await createNewRoom({ name, accountId, threshold, creatorId });
      }
    } catch (error: any) {
      setError(error?.message || t('createMultisigAccount.errorMessage'));
    }

    toggleLoading();
    setTimeout(() => closeMultisigModal({ complete: true }), 2000);
  };

  type MultisigParams = {
    name: string;
    accountId: AccountId;
    threshold: number;
    creatorId: AccountId;
    roomId: string;
  };
  const createFromExistingRoom = (params: MultisigParams) => {
    console.log('Trying to create Multisig from existing room ', params.roomId);

    walletModel.events.multisigCreated({
      wallet: {
        name: params.name,
        type: WalletType.MULTISIG,
        signingType: SigningType.MULTISIG,
      },
      accounts: [
        {
          signatories,
          name: params.name.trim(),
          accountId: params.accountId,
          matrixRoomId: params.roomId,
          threshold: params.threshold,
          creatorAccountId: params.creatorId,
          cryptoType: CryptoType.SR25519,
          chainType: ChainType.SUBSTRATE,
          type: AccountType.MULTISIG,
        },
      ],
    });
  };

  const createNewRoom = async (params: Omit<MultisigParams, 'roomId'>): Promise<void> => {
    console.log('Trying to create new Multisig room');

    const matrixRoomId = await matrix.createRoom({
      creatorAccountId: params.creatorId,
      accountName: params.name,
      accountId: params.accountId,
      threshold: params.threshold,
      signatories: signatories.map(({ accountId, matrixId }) => ({ accountId, matrixId })),
    });

    walletModel.events.multisigCreated({
      wallet: {
        name: params.name,
        type: WalletType.MULTISIG,
        signingType: SigningType.MULTISIG,
      },
      accounts: [
        {
          matrixRoomId,
          signatories,
          name: name.trim(),
          accountId: params.accountId,
          threshold: params.threshold,
          creatorAccountId: params.creatorId,
          cryptoType: CryptoType.SR25519,
          chainType: ChainType.SUBSTRATE,
          type: AccountType.MULTISIG,
        },
      ],
    });
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
          onSubmit={createWallet}
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
