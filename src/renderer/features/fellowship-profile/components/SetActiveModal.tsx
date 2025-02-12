import { useUnit } from 'effector-react';
import { type PropsWithChildren, useState } from 'react';

import { useI18n } from '@/shared/i18n';
import { nonNullable, nullable } from '@/shared/lib/utils';
import { Button } from '@/shared/ui';
import { Box, Carousel, Modal } from '@/shared/ui-kit';
import { basketUtils } from '@/entities/basket';
import { OperationTitle } from '@/entities/chain';
import { SignButton } from '@/entities/operations';
import { OperationResult } from '@/entities/transaction';
import { OperationSign, OperationSubmit } from '@/features/operations';
import { setActive } from '../model/setActive';

import { SetActiveConfirmation } from './SetActiveConfirmation';

type Step = 'confirm' | 'sign' | 'submit' | 'basket';

type Props = PropsWithChildren<{
  isActive: boolean;
  disabled: boolean;
}>;

export const SetActiveModal = ({ isActive, disabled, children }: Props) => {
  const { t } = useI18n();
  const [step, setStep] = useState<Step>('confirm');
  const isOpen = useUnit(setActive.flow.status);
  const account = useUnit(setActive.$account);
  const wallet = useUnit(setActive.$wallet);
  const input = useUnit(setActive.$input);
  const fee = useUnit(setActive.$fee);

  const handleToggle = (open: boolean) => {
    if (disabled) return;

    if (open) {
      setActive.flow.open({ isActive });
    } else {
      setStep('confirm');
      setActive.flow.close({ isActive });
    }
  };

  const handleSign = () => {
    setActive.sign();
    setStep('sign');
  };

  const handleBasketSave = () => {
    setActive.saveToBasket();
    setStep('basket');
  };

  if (step === 'submit') {
    return <OperationSubmit isOpen={isOpen} onClose={() => handleToggle(false)} />;
  }

  if (step === 'basket') {
    return (
      <OperationResult
        isOpen={isOpen}
        variant="success"
        autoCloseTimeout={2000}
        title={t('operation.addedToBasket')}
        onClose={() => handleToggle(false)}
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
        onClose={() => handleToggle(false)}
      />
    );
  }

  return (
    <Modal size="md" isOpen={isOpen} onToggle={handleToggle}>
      <Modal.Trigger disabled={disabled}>{children}</Modal.Trigger>
      <Modal.Title close>
        <OperationTitle title={t('fellowship.profile.setActive.title')} chainId={input.chain.chainId} />
      </Modal.Title>
      <Modal.Content>
        <Carousel item={step}>
          <Carousel.Item id="confirm" index={0}>
            <Box padding={[4, 5]}>
              <SetActiveConfirmation
                asset={input.asset}
                chain={input.chain}
                wallets={input.wallets}
                account={account}
                isActive={isActive}
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
