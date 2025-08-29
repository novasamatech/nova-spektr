import { useUnit } from 'effector-react';
import { type ComponentProps, type PropsWithChildren, useEffect, useState } from 'react';

import { type Wallet } from '@/shared/core';
import { useI18n } from '@/shared/i18n';
import { Step, isStep, toAccountId } from '@/shared/lib/utils';
import { Button, Icon, InputHint, SmallTitleText } from '@/shared/ui';
import { TransactionValidationError } from '@/shared/ui-entities';
import { Box, Field, Modal, Select } from '@/shared/ui-kit';
import { OperationTitle } from '@/entities/chain';
import { walletModel } from '@/entities/wallet';
import { OperationSign } from '@/features/operations';
import { OperationSubmitWithAction } from '@/features/operations/OperationSubmit';
import { changeSignatoriesModel } from '../model/change-signatories-model';
import { formModel } from '../model/form-model';
import { signatoryModel } from '../model/signatory-model';

import { ConfirmationStep } from './ConfirmationStep';
import { MultisigFees } from './components/MultisigFees';
import { Signatory } from './components/Signatory';

const MODAL_SIZE: Record<string, Pick<ComponentProps<typeof Modal>, 'size' | 'height'>> = {
  [Step.SIGNATORIES_THRESHOLD]: { size: 'mdlg', height: 'full' },
  [Step.SIGN]: { size: 'md', height: 'fit' },
  [Step.CONFIRM]: { size: 'md', height: 'fit' },
  [Step.SUBMIT]: { size: 'md', height: 'fit' },
};

type Props = PropsWithChildren<{
  wallet: Wallet;
  onClose?: () => void;
}>;

export const ChangeSignatories = ({ wallet, onClose, children }: Props) => {
  const { t } = useI18n();

  const [isModalOpen, setIsModalOpen] = useState(false);

  const step = useUnit(changeSignatoriesModel.$step);
  const canSubmit = useUnit(changeSignatoriesModel.$canSubmit);
  const chain = useUnit(changeSignatoriesModel.$chain);
  const errors = useUnit(changeSignatoriesModel.$errors);
  const threshold = useUnit(formModel.$threshold);
  const invalidAddresses = useUnit(formModel.$invalidAddresses);

  const duplicateSignatories = useUnit(signatoryModel.$duplicateSignatories);
  const signatories = useUnit(signatoryModel.$signatories);
  const wallets = useUnit(walletModel.$wallets);

  const thresholdDisabled = signatories.length < 2 || signatories.some((s) => s.address === '');

  const closeModal = () => {
    setIsModalOpen(false);
    changeSignatoriesModel.flow.close({ wallet: null });
    onClose?.();
  };

  useEffect(() => {
    if (step === Step.NONE) {
      setIsModalOpen(false);
    }
  }, [step]);

  const onToggle = (isOpen: boolean) => {
    if (isOpen) {
      setIsModalOpen(true);
      changeSignatoriesModel.flow.open({ wallet });
      return;
    }

    closeModal();
  };

  const onSubmit = () => {
    changeSignatoriesModel.viewOperation();
    closeModal();
  };

  if (isStep(step, Step.SUBMIT)) {
    return <OperationSubmitWithAction isOpen={isModalOpen} onClose={closeModal} onSubmit={onSubmit} />;
  }

  return (
    <Modal isOpen={isModalOpen} size={MODAL_SIZE[step].size} height={MODAL_SIZE[step].height} onToggle={onToggle}>
      <Modal.Trigger>{children}</Modal.Trigger>

      <Modal.Title close>
        {chain && <OperationTitle title={t('flexibleMultisig.editTitleOn')} chainId={chain.chainId} />}
      </Modal.Title>
      {isStep(step, Step.CONFIRM) && <ConfirmationStep />}
      {isStep(step, Step.SIGNATORIES_THRESHOLD) && (
        <>
          <Modal.Content>
            <div className="flex h-full flex-col gap-y-6 px-5 pt-4 pb-6">
              <SmallTitleText>{t('flexibleMultisig.editSubtitle')}</SmallTitleText>

              <hr className="-ml-5 w-[110%] border-divider" />

              {signatories.map((signatory, index) => (
                <Signatory
                  key={index}
                  isOwnAccount={index === 0}
                  isDuplicate={duplicateSignatories[toAccountId(signatory.address)]?.includes(index)}
                  isInvalidAddress={invalidAddresses.includes(signatory.address)}
                  signatoryIndex={index}
                  signatory={signatory}
                  onDelete={signatoryModel.deleteSignatory}
                />
              ))}

              <Button
                size="md"
                variant="text"
                className="h-8.5 w-max justify-center gap-x-1 pl-0"
                suffixElement={<Icon className="text-icon-primary" name="add" size={16} />}
                onClick={() => signatoryModel.addSignatory({ address: '', walletId: '' })}
              >
                {t('createMultisigAccount.addNewSignatory')}
              </Button>

              <hr className="-ml-5 w-[110%] border-divider" />

              <div className="flex gap-x-6">
                <Box width="232px">
                  <Field text={t('createMultisigAccount.thresholdName')}>
                    <Select
                      placeholder={t('createMultisigAccount.thresholdPlaceholder')}
                      value={(threshold || '').toString()}
                      disabled={thresholdDisabled}
                      height="md"
                      onChange={(value) => formModel.thresholdChanged(Number(value))}
                    >
                      {Array.from({ length: signatories.length - 1 }, (_, index) => (
                        <Select.Item key={index} value={(index + 2).toString()}>
                          {index + 2}
                        </Select.Item>
                      ))}
                    </Select>
                  </Field>
                </Box>
                <InputHint active className="mt-8.5 flex-1">
                  {t('flexibleMultisig.thresholdDescription')}
                </InputHint>
              </div>

              <div className="mt-auto flex flex-col">
                <TransactionValidationError errors={errors} wallets={wallets} />
              </div>
            </div>
          </Modal.Content>

          <Modal.Footer>
            <Box fitContainer direction="row" horizontalAlign="end" verticalAlign="center">
              <div className="flex items-center justify-end gap-x-6">
                <MultisigFees />

                <Button key="create" type="submit" disabled={!canSubmit} onClick={() => formModel.formSubmit()}>
                  {t('createMultisigAccount.continueButton')}
                </Button>
              </div>
            </Box>
          </Modal.Footer>
        </>
      )}
      {isStep(step, Step.SIGN) && <OperationSign onGoBack={() => changeSignatoriesModel.stepChanged(Step.CONFIRM)} />}
    </Modal>
  );
};
