import { ComponentProps, useState, useEffect } from 'react';
import { useUnit } from 'effector-react';
import noop from 'lodash/noop';

import { BaseModal, HeaderTitleText, Button, IconButton } from '@shared/ui';
import { useI18n } from '@app/providers';
import { useToggle } from '@shared/lib/hooks';
import { OperationResult } from '@entities/transaction';
import { ExtendedContact, ExtendedWallet } from './common/types';
import { SelectSignatoriesStep, ConfirmationStep, NameThresholdStep } from './components';
import { contactModel } from '@entities/contact';
import { DEFAULT_TRANSITION } from '@shared/lib/utils';
import { walletModel } from '@entities/wallet';
import { flowModel } from '../../model/flow-model';

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

export const MultiChainMultisigWallet = ({ isOpen, onClose, onComplete, onBack }: Props) => {
  const { t } = useI18n();
  const wallets = useUnit(walletModel.$wallets);
  const contacts = useUnit(contactModel.$contacts);

  const isLoading = useUnit(flowModel.$isLoading);
  const error = useUnit(flowModel.$error);

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
      flowModel.events.reset();
      setName('');
    }

    if (!isOpen && isModalOpen) {
      closeMultisigModal({ closeAll: false });
    }
  }, [isOpen]);

  useEffect(() => {
    flowModel.events.callbacksChanged({ onComplete });
  }, [onComplete]);

  // const goToPrevStep = () => {
  //   if (activeStep === Step.INIT) {
  //     onBack();
  //   } else {
  //     setActiveStep((prev) => prev - 1);
  //   }
  // };

  const closeMultisigModal = (params: { complete?: boolean; closeAll?: boolean } = { closeAll: true }) => {
    toggleIsModalOpen();

    setTimeout(params?.complete ? onComplete : params?.closeAll ? onClose : noop, DEFAULT_TRANSITION);
  };

  // const submitHandler = (args: any) => {
  //   toggleResultModal();
  //   setName(args.name);

  //   flowModel.events.walletCreated(args);
  // };

  const getResultProps = (): OperationResultProps => {
    if (isLoading) return { variant: 'loading' };
    if (error) return { variant: 'error', description: error };

    return { variant: 'success', description: t('createMultisigAccount.successMessage') };
  };

  const modalTitle = (
    <div className="flex justify-between items-center px-5 py-3 w-[464px] bg-white rounded-tl-lg">
      <HeaderTitleText className="py-[3px]">{t('createMultisigAccount.title')}</HeaderTitleText>
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
        <NameThresholdStep
          signatories={signatories}
          // onGoBack={goToPrevStep}
        />

        <section className="relative flex flex-col px-5 py-4 flex-1 bg-input-background-disabled h-full">
          <IconButton
            name="close"
            size={20}
            className="absolute right-3 -top-10 m-1"
            onClick={() => closeMultisigModal()}
          />

          {/* Should be before SelectSignatories to avoid hidden nova wallet icon */}
          {activeStep === Step.CONFIRMATION && (
            <ConfirmationStep wallets={signatoryWallets} contacts={signatoryContacts} />
          )}

          <SelectSignatoriesStep
            isActive={activeStep === Step.INIT}
            wallets={wallets}
            accounts={wallets.map((wallet) => wallet.accounts).flat()}
            contacts={contacts}
            onSelect={(wallets, contacts) => {
              setSignatoryWallets(wallets);
              setSignatoryContacts(contacts);
            }}
          />
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
