import { useUnit } from 'effector-react';
import { type PropsWithChildren, useState } from 'react';

import { useFlow } from '@/shared/effector';
import { useI18n } from '@/shared/i18n';
import { nonNullable, nullable } from '@/shared/lib/utils';
import { Button, Icon, LargeTitleText } from '@/shared/ui';
import { Box, Carousel, Modal } from '@/shared/ui-kit';
import { memberService, salaryService } from '@/domains/collectives';
import { basketUtils } from '@/entities/basket';
import { OperationTitle } from '@/entities/chain';
import { SignButton } from '@/entities/operations';
import { OperationResult } from '@/entities/transaction';
import { OperationSign, OperationSubmit } from '@/features/operations';
import { fellowshipSalaryFeature } from '../model/feature';
import { memberSalary } from '../model/memberSalary';
import { salaryRequest } from '../model/salaryRequest';

import { SalaryRegisterConfirmation } from './SalaryRegisterConfirmation';

type Step = 'confirm' | 'sign' | 'submit' | 'basket';

type Props = PropsWithChildren<{
  disabled?: boolean;
}>;

export const SalaryRegisterModal = ({ disabled, children }: Props) => {
  useFlow(salaryRequest.flow, null);

  const { t } = useI18n();
  const [open, setOpen] = useState(false);
  const [step, setStep] = useState<Step>('confirm');
  const input = useUnit(fellowshipSalaryFeature.input);
  const account = useUnit(salaryRequest.$account);
  const wallet = useUnit(salaryRequest.$wallet);
  const fee = useUnit(salaryRequest.$fee);
  const { active: activeSalary, passive: passiveSalary } = useUnit(memberSalary.$memberSalary);

  let salary: string | null = null;
  if (input?.member && memberService.isCoreMember(input.member)) {
    salary = salaryService.formatSalaryAmount(input?.member?.isActive ? activeSalary : passiveSalary);
  }

  const handleToggle = (open: boolean) => {
    if (disabled) return;
    setOpen(open);
    setStep('confirm');
  };

  const handleSign = () => {
    salaryRequest.sign();
    setStep('sign');
  };

  const handleBasketSave = () => {
    salaryRequest.saveToBasket();
    setStep('basket');
  };

  if (step === 'submit') {
    return <OperationSubmit isOpen={open} onClose={() => handleToggle(false)} />;
  }

  if (step === 'basket') {
    return (
      <OperationResult
        isOpen={open}
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
        isOpen={open}
        variant="error"
        autoCloseTimeout={2000}
        title={t('fellowship.voting.errors.noAccount')}
        onClose={() => handleToggle(false)}
      />
    );
  }

  return (
    <Modal size="md" isOpen={open} onToggle={handleToggle}>
      <Modal.Trigger disabled={disabled}>{children}</Modal.Trigger>
      <Modal.Title close>
        <OperationTitle title={t('fellowship.salary.salaryRequest')} chainId={input.chain.chainId} />
      </Modal.Title>
      <Modal.Content>
        <Box horizontalAlign="center" padding={6}>
          <Icon name="request" size={60} />
        </Box>

        {salary && (
          <Box horizontalAlign="center">
            <LargeTitleText className="pb-4">{salary}</LargeTitleText>
          </Box>
        )}

        <Carousel item={step}>
          <Carousel.Item id="confirm" index={0}>
            <Box padding={[4, 5]}>
              <SalaryRegisterConfirmation
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
