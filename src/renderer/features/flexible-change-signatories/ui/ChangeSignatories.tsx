import { useUnit } from 'effector-react';
import { type ComponentProps, type PropsWithChildren, useEffect, useMemo, useRef, useState } from 'react';

import { type Wallet } from '@/shared/core';
import { useI18n } from '@/shared/i18n';
import { Step, isStep, toAddress } from '@/shared/lib/utils';
import { type AccountId } from '@/shared/polkadotjs-schemas';
import { Button } from '@/shared/ui';
import { Box, Modal } from '@/shared/ui-kit';
import { OperationTitle } from '@/entities/chain';
import { OperationSign } from '@/features/operations';
import { OperationSubmitWithAction } from '@/features/operations/OperationSubmit';
import { StepPath, pathModel } from '@/features/signing-path';
import { changeSignatoriesModel } from '../model/change-signatories-model';

import { ConfirmationStep } from './ConfirmationStep';
import { ExecutionModeToggle } from './components/ExecutionModeToggle';
import { InitializingBody } from './components/InitializingBody';
import { PersistentBanner } from './components/PersistentBanner';
import { UnifiedPicker } from './components/UnifiedPicker';

const MODAL_SIZE: Record<number, Pick<ComponentProps<typeof Modal>, 'size' | 'height'>> = {
  [Step.SELECT_CONTROLLER]: { size: 'mdlg', height: 'full' },
  [Step.SIGNING_PATH]: { size: 'mdlg', height: 'full' },
  [Step.SIGN]: { size: 'md', height: 'fit' },
  [Step.CONFIRM]: { size: 'mdlg', height: 'fit' },
  [Step.SUBMIT]: { size: 'md', height: 'fit' },
};

type Props = PropsWithChildren<{
  wallet: Wallet;
  currentControllerAccountId?: AccountId | null;
  onClose?: () => void;
  launchOpen?: boolean;
  hideTrigger?: boolean;
}>;

export const ChangeSignatories = ({
  wallet,
  currentControllerAccountId,
  onClose,
  children,
  launchOpen,
  hideTrigger,
}: Props) => {
  const { t } = useI18n();

  const [isModalOpen, setIsModalOpen] = useState(launchOpen ?? false);
  const walletRef = useRef(wallet);
  walletRef.current = wallet;

  const [bodyReady, setBodyReady] = useState(false);
  useEffect(() => {
    const handle = requestAnimationFrame(() => setBodyReady(true));

    return () => cancelAnimationFrame(handle);
  }, []);

  const overrideRef = useRef(currentControllerAccountId ?? null);
  overrideRef.current = currentControllerAccountId ?? null;

  const launchedRef = useRef(false);
  useEffect(() => {
    if (!launchOpen) return;
    if (launchedRef.current) return;
    launchedRef.current = true;

    setIsModalOpen(true);
    changeSignatoriesModel.flow.open({
      wallet: walletRef.current,
      controllerOverride: overrideRef.current,
    });
  }, [launchOpen, wallet.id]);

  const step = useUnit(changeSignatoriesModel.$step);
  const chain = useUnit(changeSignatoriesModel.$chain);
  const currentController = useUnit(changeSignatoriesModel.$currentController);
  const selectedTarget = useUnit(changeSignatoriesModel.$selectedTarget);
  const isPathComplete = useUnit(pathModel.$isComplete);
  const nextFromSelectController = useUnit(changeSignatoriesModel.nextFromSelectController);
  const nextFromSigningPath = useUnit(changeSignatoriesModel.nextFromSigningPath);
  const signingPathGoBack = useUnit(changeSignatoriesModel.signingPathGoBack);

  const currentControllerAddress = useMemo(() => {
    if (!currentController || !chain) return null;
    return toAddress(currentController.accountId, { prefix: chain.addressPrefix });
  }, [currentController, chain]);

  const currentSignatories = currentController?.signatories ?? [];
  const currentThreshold = currentController?.threshold ?? 0;

  const closeModal = () => {
    setIsModalOpen(false);
    changeSignatoriesModel.flow.close({ wallet: null });
    onClose?.();
  };

  const onToggle = (isOpen: boolean) => {
    if (isOpen) {
      setIsModalOpen(true);
      changeSignatoriesModel.flow.open({ wallet, controllerOverride: currentControllerAccountId ?? null });
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

  const showInitializingBody =
    (!bodyReady || !chain || !currentControllerAddress) && !isStep(step, Step.SIGN) && !isStep(step, Step.SUBMIT);

  return (
    <Modal
      isOpen={isModalOpen}
      size={MODAL_SIZE[step]?.size ?? 'mdlg'}
      height={MODAL_SIZE[step]?.height ?? 'full'}
      onToggle={onToggle}
    >
      {!hideTrigger && <Modal.Trigger>{children}</Modal.Trigger>}

      <Modal.Title close>
        {chain ? (
          <OperationTitle title={t('flexibleMultisig.editTitleOn')} chainId={chain.chainId} />
        ) : (
          t('flexibleMultisig.editTitleOn')
        )}
      </Modal.Title>

      {showInitializingBody && (
        <Modal.Content>
          <InitializingBody />
        </Modal.Content>
      )}

      {!showInitializingBody && isStep(step, Step.CONFIRM) && chain && currentControllerAddress && (
        <ConfirmationStep
          banner={
            <PersistentBanner
              currentControllerAddress={currentControllerAddress}
              currentSignatories={currentSignatories}
              currentThreshold={currentThreshold}
            />
          }
        />
      )}

      {!showInitializingBody && isStep(step, Step.SELECT_CONTROLLER) && chain && currentControllerAddress && (
        <>
          <Modal.Content>
            <div className="flex h-full flex-col gap-y-4 px-5 pt-4 pb-6">
              <PersistentBanner
                currentControllerAddress={currentControllerAddress}
                currentSignatories={currentSignatories}
                currentThreshold={currentThreshold}
              />
              <ExecutionModeToggle />
              <UnifiedPicker
                chain={chain}
                currentControllerAddress={currentControllerAddress}
                currentThreshold={currentThreshold}
              />
            </div>
          </Modal.Content>
          <Modal.Footer>
            <Box fitContainer direction="row" horizontalAlign="end" verticalAlign="center">
              <Button disabled={!selectedTarget} onClick={() => nextFromSelectController()}>
                {t('flexibleMultisig.editProxy.picker.next')}
              </Button>
            </Box>
          </Modal.Footer>
        </>
      )}

      {!showInitializingBody && isStep(step, Step.SIGNING_PATH) && chain && (
        <>
          <Modal.Content>
            <div className="flex h-full flex-col gap-y-4 px-5 pt-4 pb-6">
              <StepPath
                chainId={chain.chainId}
                lockedSourceCount={1}
                restrictToOwnAccounts
                allowedProxyTypes={['Any']}
                disabledProxyReason={t('flexibleMultisig.editProxy.signingPathProxyTypeDisabled')}
              />
            </div>
          </Modal.Content>
          <Modal.Footer>
            <Box fitContainer direction="row" horizontalAlign="space-between" verticalAlign="center">
              <Button variant="text" onClick={() => signingPathGoBack()}>
                {t('createMultisigAccount.backButton')}
              </Button>
              <Button disabled={!isPathComplete} onClick={() => nextFromSigningPath()}>
                {t('flexibleMultisig.editProxy.picker.next')}
              </Button>
            </Box>
          </Modal.Footer>
        </>
      )}

      {isStep(step, Step.SIGN) && <OperationSign onGoBack={() => changeSignatoriesModel.stepChanged(Step.CONFIRM)} />}
    </Modal>
  );
};
