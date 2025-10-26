import { type BN } from '@polkadot/util';
import { useUnit } from 'effector-react';
import { type PropsWithChildren, useState } from 'react';

import { useI18n } from '@/shared/i18n';
import { formatAsset, nonNullable, nullable } from '@/shared/lib/utils';
import { Alert, BodyText, Button, DetailRow, Icon } from '@/shared/ui';
import { TransactionDetails } from '@/shared/ui-entities';
import { Box, Carousel, Modal } from '@/shared/ui-kit';
import { salaryService } from '@/domains/collectives';
import { basketUtils } from '@/entities/basket';
import { OperationTitle } from '@/entities/chain';
import { SignButton } from '@/entities/operations';
import { OperationResult } from '@/entities/transaction';
import { OperationSign, OperationSubmit } from '@/features/operations';
import { setActive } from '../model/setActive';

type Step = 'confirm' | 'sign' | 'submit' | 'basket';

type Props = PropsWithChildren<{
  isActive: boolean;
  disabled: boolean;
  salary: {
    active: BN;
    passive: BN;
  };
}>;

function getSalaryChange(
  isActive: boolean,
  salary: {
    active: BN;
    passive: BN;
  },
) {
  const from = salaryService.formatSalaryAmount(isActive ? salary.passive : salary.active);
  const to = salaryService.formatSalaryAmount(isActive ? salary.active : salary.passive);
  return `${from} → ${to}`;
}

export const SetActiveModal = ({ isActive, disabled, children, salary }: Props) => {
  const { t } = useI18n();
  const [step, setStep] = useState<Step>('confirm');
  const [alertOpen, setAlertOpen] = useState(!isActive);
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

  const salaryChange = getSalaryChange(isActive, salary);

  const handleSign = () => {
    setActive.sign();
    setStep('sign');
  };

  const handleBasketSave = () => {
    setActive.saveToBasket();
    setStep('basket');
  };

  const handleAlertClose = () => {
    setAlertOpen(false);
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
              <Box horizontalAlign="center" padding={[0, 0, 6, 0]}>
                <Icon name="switch" size={60} />
              </Box>

              <TransactionDetails
                wallets={input.wallets}
                chain={input.chain}
                initiators={[account]}
                signatory={account}
              >
                <DetailRow label={t('fellowship.voting.confirmation.status')}>
                  {isActive ? t('fellowship.profile.setActive.inactive') : t('fellowship.profile.setActive.active')}
                  &nbsp;{'→'}&nbsp;
                  {isActive ? t('fellowship.profile.setActive.active') : t('fellowship.profile.setActive.inactive')}
                </DetailRow>
                <DetailRow label={t('fellowship.voting.confirmation.salary')}>{salaryChange}</DetailRow>
                {fee && (
                  <DetailRow label={t('fellowship.voting.confirmation.fee')}>{formatAsset(fee, input.asset)}</DetailRow>
                )}
              </TransactionDetails>

              {alertOpen && (
                <div className="pt-6">
                  <Alert
                    title={t('fellowship.profile.setActive.setInactiveAlert.title')}
                    active={alertOpen}
                    onClose={handleAlertClose}
                  >
                    <BodyText>{t('fellowship.profile.setActive.setInactiveAlert.text')}</BodyText>
                  </Alert>
                </div>
              )}
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
