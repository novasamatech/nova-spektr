import { useForm } from 'effector-forms';
import { ComponentProps, useEffect } from 'react';
import { useUnit } from 'effector-react';
import noop from 'lodash/noop';

import { BaseModal, HeaderTitleText, Button, IconButton } from '@shared/ui';
import { useI18n } from '@app/providers';
import { useToggle } from '@shared/lib/hooks';
import { OperationResult } from '@entities/transaction';
import { ConfirmSignatories, WalletForm } from './components';
import { contactModel } from '@entities/contact';
import { DEFAULT_TRANSITION, dictionary } from '@shared/lib/utils';
import { createMultisigWalletModel } from '../../model/create-multisig-wallet-model';
import { SelectSignatories } from './components/SelectAccountSignatories';
import { walletModel } from '@entities/wallet';
import { networkModel } from '@entities/network';
import { createMultisigUtils } from '../../lib/create-multisig-utils';
import { Step } from '../../lib/types';
import { formModel } from '../../model/create-multisig-form-model';

type OperationResultProps = Pick<ComponentProps<typeof OperationResult>, 'variant' | 'description'>;

type Props = {
  isOpen: boolean;
  onClose: () => void;
  onComplete: () => void;
  // onBack: () => void;
};

export const MultisigWallet = ({ isOpen, onClose, onComplete }: Props) => {
  const { t } = useI18n();

  const accounts = useUnit(formModel.$availableAccounts);
  const wallets = useUnit(walletModel.$wallets);
  const contacts = useUnit(contactModel.$contacts);
  const {
    fields: { chain },
  } = useForm(formModel.$createMultisigForm);
  const chains = useUnit(networkModel.$chains);
  const isLoading = useUnit(createMultisigWalletModel.$isLoading);
  const error = useUnit(createMultisigWalletModel.$error);
  const activeStep = useUnit(createMultisigWalletModel.$step);
  const accountSignatories = useUnit(formModel.$accountSignatories);
  const contactSignatories = useUnit(formModel.$contactSignatories);
  const signatories = useUnit(formModel.$signatories);

  const { submit } = useForm(formModel.$createMultisigForm);

  const [isModalOpen, toggleIsModalOpen] = useToggle(isOpen);
  const [isResultModalOpen, toggleResultModal] = useToggle();

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

  const submitHandler = (args: any) => {
    toggleResultModal();
    submit();
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
          isActive={createMultisigUtils.isInitStep(activeStep)}
          signatories={signatories}
          isLoading={isLoading}
          // onGoBack={goToPrevStep}
          onContinue={() => createMultisigWalletModel.events.stepChanged(Step.CONFIRM)}
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
            accounts={accounts}
            wallets={dictionary(wallets, 'id')}
            contacts={contacts}
            chain={chains[chain.value]}
            onSelect={(accounts, contacts) => {
              formModel.events.accountSignatoriesChanged(accounts);
              formModel.events.contactSignatoriesChanged(contacts);
            }}
          />

          {createMultisigUtils.isConfirmStep(activeStep) && (
            <ConfirmSignatories
              chain={chains[chain.value]}
              accounts={accountSignatories}
              contacts={contactSignatories}
            />
          )}
        </section>
      </BaseModal>

      <OperationResult
        {...getResultProps()}
        title={t('createMultisigAccount.createionStatusTitle')}
        isOpen={isModalOpen && isResultModalOpen}
        onClose={() => closeMultisigModal({ complete: true })}
      >
        {error && <Button onClick={toggleResultModal}>{t('createMultisigAccount.closeButton')}</Button>}
      </OperationResult>
    </>
  );
};
