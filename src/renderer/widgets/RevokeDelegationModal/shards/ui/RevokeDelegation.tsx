import { useUnit } from 'effector-react';

import { useI18n } from '@/shared/i18n';
import { useModalClose } from '@/shared/lib/hooks';
import { Step, isStep, nonNullable, nullable } from '@/shared/lib/utils';
import { Button } from '@/shared/ui';
import { Modal } from '@/shared/ui-kit';
import { basketUtils } from '@/entities/basket';
import { OperationTitle } from '@/entities/chain';
import { SignButton } from '@/entities/operations';
import { OperationResult } from '@/entities/transaction';
import { OperationSign, OperationSubmit } from '@/features/operations';
import { ConfirmSlider, RevokeDelegationConfirmation as Confirmation } from '@/features/operations/OperationsConfirm';
import { revokeDelegationModel } from '../model/revoke-delegation-model';

export const RevokeDelegation = () => {
  const { t } = useI18n();

  const step = useUnit(revokeDelegationModel.$step);
  const walletData = useUnit(revokeDelegationModel.$walletData);
  const initiatorWallet = useUnit(revokeDelegationModel.$initiatorWallet);
  const transactions = useUnit(revokeDelegationModel.$transactions);
  const network = useUnit(revokeDelegationModel.$network);

  const [isModalOpen, closeModal] = useModalClose(!isStep(step, Step.NONE), revokeDelegationModel.flowFinished);
  const [isBasketModalOpen, closeBasketModal] = useModalClose(
    isStep(step, Step.BASKET),
    revokeDelegationModel.flowFinished,
  );

  if (!walletData || !network) {
    return null;
  }

  if (isStep(step, Step.SUBMIT)) {
    return <OperationSubmit isOpen={isModalOpen} onClose={closeModal} />;
  }

  if (isStep(step, Step.BASKET)) {
    return (
      <OperationResult
        isOpen={isBasketModalOpen}
        variant="success"
        title={t('operation.addedToBasket')}
        autoCloseTimeout={2000}
        onClose={closeBasketModal}
      />
    );
  }

  if (nullable(transactions)) {
    return null;
  }

  return (
    <Modal isOpen={isModalOpen} size="fit" onToggle={closeModal}>
      <Modal.Title close>
        <OperationTitle title={t('governance.revokeDelegation.title')} chainId={walletData.chain!.chainId} />
      </Modal.Title>
      <Modal.Content>
        {isStep(step, Step.CONFIRM) && transactions.length === 1 && (
          <Confirmation
            config={{ withFormatAmount: false }}
            secondaryActionButton={
              nonNullable(initiatorWallet) &&
              basketUtils.isBasketAvailable(initiatorWallet) && (
                <Button pallet="secondary" onClick={() => revokeDelegationModel.txSaved()}>
                  {t('operation.addToBasket')}
                </Button>
              )
            }
            onGoBack={() => revokeDelegationModel.stepChanged(Step.NONE)}
          />
        )}

        {isStep(step, Step.CONFIRM) && transactions.length > 1 && (
          <ConfirmSlider
            count={transactions.length}
            footer={
              <div className="flex gap-2">
                {initiatorWallet && basketUtils.isBasketAvailable(initiatorWallet) && (
                  <Button pallet="secondary" onClick={() => revokeDelegationModel.txSaved()}>
                    {t('operation.addToBasket')}
                  </Button>
                )}

                <SignButton isDefault type={walletData.wallet?.type} onClick={revokeDelegationModel.txsConfirmed} />
              </div>
            }
          >
            {transactions?.map((t, index) => (
              <ConfirmSlider.Item key={index}>
                <Confirmation id={index} hideSignButton config={{ withFormatAmount: false }} />
              </ConfirmSlider.Item>
            ))}
          </ConfirmSlider>
        )}

        {isStep(step, Step.SIGN) && <OperationSign onGoBack={() => revokeDelegationModel.stepChanged(Step.CONFIRM)} />}
      </Modal.Content>
    </Modal>
  );
};
