import { useUnit } from 'effector-react';
import { type ComponentProps, type PropsWithChildren, useEffect, useMemo, useRef, useState } from 'react';

import { type Wallet } from '@/shared/core';
import { useI18n } from '@/shared/i18n';
import { Step, isStep, toAddress } from '@/shared/lib/utils';
import { Button } from '@/shared/ui';
import { Box, Modal } from '@/shared/ui-kit';
import { OperationTitle } from '@/entities/chain';
import { OperationSign } from '@/features/operations';
import { OperationSubmitWithAction } from '@/features/operations/OperationSubmit';
import { changeSignatoriesModel } from '../model/change-signatories-model';

import { ConfirmationStep } from './ConfirmationStep';
import { PersistentBanner } from './components/PersistentBanner';
import { SigningPathStep } from './components/SigningPathStep';
import { UnifiedPicker } from './components/UnifiedPicker';

const MODAL_SIZE: Record<number, Pick<ComponentProps<typeof Modal>, 'size' | 'height'>> = {
  [Step.SELECT_CONTROLLER]: { size: 'mdlg', height: 'full' },
  [Step.SIGNING_PATH]: { size: 'mdlg', height: 'full' },
  [Step.SIGN]: { size: 'md', height: 'fit' },
  [Step.CONFIRM]: { size: 'md', height: 'fit' },
  [Step.SUBMIT]: { size: 'md', height: 'fit' },
};

type Props = PropsWithChildren<{
  wallet: Wallet;
  onClose?: () => void;
  launchOpen?: boolean;
  hideTrigger?: boolean;
}>;

export const ChangeSignatories = ({ wallet, onClose, children, launchOpen, hideTrigger }: Props) => {
  const { t } = useI18n();

  const [isModalOpen, setIsModalOpen] = useState(false);
  const walletRef = useRef(wallet);
  walletRef.current = wallet;

  useEffect(() => {
    if (!launchOpen) return;

    setIsModalOpen(true);
    changeSignatoriesModel.flow.open({ wallet: walletRef.current });
  }, [launchOpen, wallet.id]);

  const step = useUnit(changeSignatoriesModel.$step);
  const chain = useUnit(changeSignatoriesModel.$chain);
  const flexibleAccount = useUnit(changeSignatoriesModel.$flexibleMultisigAccount);
  const selectedTarget = useUnit(changeSignatoriesModel.$selectedTarget);
  const nextFromSelectController = useUnit(changeSignatoriesModel.nextFromSelectController);
  const signingPathConfirmed = useUnit(changeSignatoriesModel.signingPathConfirmed);

  const currentControllerAddress = useMemo(() => {
    if (!flexibleAccount || !chain) return null;
    return toAddress(flexibleAccount.multisigAccountId, { prefix: chain.addressPrefix });
  }, [flexibleAccount, chain]);

  const currentSignatories = useMemo(() => {
    if (!flexibleAccount) return [];
    return flexibleAccount.signatories.map((s) => s.accountId);
  }, [flexibleAccount]);

  const currentThreshold = flexibleAccount?.threshold ?? 0;

  const closeModal = () => {
    setIsModalOpen(false);
    changeSignatoriesModel.flow.close({ wallet: null });
    onClose?.();
  };

  const onToggle = (isOpen: boolean) => {
    if (isOpen) {
      setIsModalOpen(true);
      changeSignatoriesModel.flow.open({ wallet });
    } else {
      closeModal();
    }
  };

  const onSubmit = () => {
    changeSignatoriesModel.viewOperation();
    closeModal();
  };

  if (isStep(step, Step.SUBMIT)) {
    return (
      <OperationSubmitWithAction
        isOpen={isModalOpen}
        onClose={() => changeSignatoriesModel.stepChanged(Step.CONFIRM)}
        onSubmit={onSubmit}
      />
    );
  }

  return (
    <Modal
      isOpen={isModalOpen}
      size={MODAL_SIZE[step]?.size ?? 'mdlg'}
      height={MODAL_SIZE[step]?.height ?? 'full'}
      onToggle={onToggle}
    >
      {!hideTrigger && <Modal.Trigger>{children}</Modal.Trigger>}

      <Modal.Title close>
        {chain && <OperationTitle title={t('flexibleMultisig.editTitleOn')} chainId={chain.chainId} />}
      </Modal.Title>

      {isStep(step, Step.CONFIRM) && (
        <ConfirmationStep
          banner={
            chain && currentControllerAddress ? (
              <PersistentBanner
                currentControllerAddress={currentControllerAddress}
                currentSignatories={currentSignatories}
                currentThreshold={currentThreshold}
              />
            ) : null
          }
        />
      )}

      {isStep(step, Step.SELECT_CONTROLLER) && chain && currentControllerAddress && (
        <>
          <Modal.Content>
            <div className="flex h-full flex-col gap-y-4 px-5 pt-4 pb-6">
              <PersistentBanner
                currentControllerAddress={currentControllerAddress}
                currentSignatories={currentSignatories}
                currentThreshold={currentThreshold}
              />
              <UnifiedPicker
                chain={chain}
                currentControllerAddress={currentControllerAddress}
                currentSignatories={currentSignatories}
                currentThreshold={currentThreshold}
              />
            </div>
          </Modal.Content>
          <Modal.Footer>
            <Box fitContainer direction="row" horizontalAlign="end" verticalAlign="center">
              <Button disabled={!selectedTarget} onClick={() => nextFromSelectController()}>
                {t('flexibleMultisig.editController.picker.next')}
              </Button>
            </Box>
          </Modal.Footer>
        </>
      )}

      {isStep(step, Step.SIGNING_PATH) && chain && currentControllerAddress && (
        <Modal.Content>
          <div className="flex h-full flex-col gap-y-4 px-5 pt-4 pb-6">
            <PersistentBanner
              currentControllerAddress={currentControllerAddress}
              currentSignatories={currentSignatories}
              currentThreshold={currentThreshold}
            />
            <SigningPathStep
              currentController={{
                address: currentControllerAddress,
                name: wallet.name,
              }}
              onConfirm={(path) => signingPathConfirmed(path)}
            />
          </div>
        </Modal.Content>
      )}

      {isStep(step, Step.SIGN) && <OperationSign onGoBack={() => changeSignatoriesModel.stepChanged(Step.CONFIRM)} />}
    </Modal>
  );
};
