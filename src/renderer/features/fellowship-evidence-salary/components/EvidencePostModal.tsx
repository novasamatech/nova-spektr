import { useUnit } from 'effector-react';
import { type PropsWithChildren, useState } from 'react';

import { type HexString } from '@/shared/core';
import { useFlow } from '@/shared/effector';
import { useI18n } from '@/shared/i18n';
import { nonNullable, nullable } from '@/shared/lib/utils';
import { Button } from '@/shared/ui';
import { Box, Carousel, Modal } from '@/shared/ui-kit';
import { basketUtils } from '@/entities/basket';
import { OperationTitle } from '@/entities/chain';
import { SignButton } from '@/entities/operations';
import { OperationResult } from '@/entities/transaction';
import { OperationSign, OperationSubmit } from '@/features/operations';
import { evidencePost } from '../model/evidencePost';
import { fellowshipSalaryFeature } from '../model/feature';

import { EvidencePostConfirmation } from './EvidencePostConfirmation';

type Step = 'confirm' | 'sign' | 'submit' | 'basket';

type Props = PropsWithChildren<{
  isOpen: boolean;
  onToggle: (open: boolean, done: boolean) => unknown;
  wish: 'Promotion' | 'Retention';
  evidence: HexString;
}>;

export const EvidencePostModal = ({ isOpen, onToggle, evidence, wish, children }: Props) => {
  useFlow(evidencePost.flow, null);

  const { t } = useI18n();
  const [step, setStep] = useState<Step>('confirm');
  const input = useUnit(fellowshipSalaryFeature.input);
  const account = useUnit(evidencePost.$account);
  const wallet = useUnit(evidencePost.$wallet);
  const fee = useUnit(evidencePost.$fee);

  const handleToggle = (open: boolean, done: boolean) => {
    onToggle(open, done);
    setStep('confirm');
  };

  const handleSign = () => {
    evidencePost.sign();
    setStep('sign');
  };

  const handleBasketSave = () => {
    evidencePost.saveToBasket();
    setStep('basket');
  };

  if (step === 'submit') {
    return <OperationSubmit isOpen={isOpen} onClose={() => handleToggle(false, true)} />;
  }

  if (step === 'basket') {
    return (
      <OperationResult
        isOpen={isOpen}
        variant="success"
        autoCloseTimeout={2000}
        title={t('operation.addedToBasket')}
        onClose={() => handleToggle(false, true)}
      />
    );
  }

  if (nullable(account) || nullable(input)) {
    return (
      <OperationResult
        isOpen={isOpen}
        variant="error"
        autoCloseTimeout={2000}
        title={t('fellowship.voting.errors.noAccount')}
        onClose={() => handleToggle(false, true)}
      />
    );
  }

  const title =
    wish === 'Retention' ? t('fellowship.salary.requestRetention') : t('fellowship.salary.requestPromotion');

  return (
    <Modal size="md" isOpen={isOpen} onToggle={open => handleToggle(open, false)}>
      <Modal.Trigger>{children}</Modal.Trigger>
      <Modal.Title close>
        <OperationTitle title={title} chainId={input.chain.chainId} />
      </Modal.Title>
      <Modal.Content>
        <Carousel item={step}>
          <Carousel.Item id="confirm" index={0}>
            <Box padding={[4, 5]}>
              <EvidencePostConfirmation
                wish={wish}
                evidence={evidence}
                asset={input.asset}
                chain={input.chain}
                wallets={input.wallets}
                account={account}
                fee={fee}
              />
            </Box>
            <Modal.Footer>
              {wallet && basketUtils.isBasketAvailable(wallet) && (
                <Button pallet="secondary" onClick={handleBasketSave}>
                  {t('operation.addToBasket')}
                </Button>
              )}
              {nonNullable(wallet) && <SignButton type={wallet.type} onClick={handleSign} />}
            </Modal.Footer>
          </Carousel.Item>
          <Carousel.Item id="sign" index={1}>
            <OperationSign onSuccess={() => setStep('submit')} onGoBack={() => setStep('confirm')} />
          </Carousel.Item>
        </Carousel>
      </Modal.Content>
    </Modal>
  );
};
