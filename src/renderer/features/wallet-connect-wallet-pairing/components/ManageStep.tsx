import { useUnit } from 'effector-react';
import { Controller, type SubmitHandler, useForm } from 'react-hook-form';

import { useStatusContext } from '@/app/providers';
import { ErrorType, WalletType } from '@/shared/core';
import { useI18n } from '@/shared/i18n';
import { nullable } from '@/shared/lib/utils';
import { Button, Icon, InputHint, Loader, SmallTitleText } from '@/shared/ui';
import { type IconNames } from '@/shared/ui/Icon/data';
import { Box, Field, Input, Modal } from '@/shared/ui-kit';
import { MultiAccountsList } from '@/entities/wallet';
import { pairingForm } from '../model/pairingForm';

const WalletLogo: Record<WalletTypeName, IconNames> = {
  [WalletType.WALLET_CONNECT]: 'walletConnectOnboarding',
  [WalletType.NOVA_WALLET]: 'novaWalletOnboarding',
};

type WalletForm = {
  walletName: string;
};

type WalletTypeName = WalletType.NOVA_WALLET | WalletType.WALLET_CONNECT;

type Props = {
  type: WalletTypeName;
  onBack: () => void;
  onComplete: () => void;
};

export const ManageStep = ({ type, onBack, onComplete }: Props) => {
  const { t } = useI18n();
  const { showStatus } = useStatusContext();

  const session = useUnit(pairingForm.$session);
  const accounts = useUnit(pairingForm.$accounts);

  if (nullable(session)) {
    return (
      <Box fillContainer verticalAlign="center" horizontalAlign="center">
        <Loader color="primary" />
      </Box>
    );
  }

  const {
    handleSubmit,
    control,
    reset,
    formState: { errors, isValid },
  } = useForm<WalletForm>({
    mode: 'onChange',
    defaultValues: { walletName: '' },
  });

  // TODO: Rewrite with effector forms
  const submitHandler: SubmitHandler<WalletForm> = async ({ walletName }) => {
    pairingForm.createWallet({ name: walletName });

    reset();
    showStatus({
      title: walletName.trim(),
      description: t('onboarding.walletConnect.pairedDescription'),
      content: (
        <div className="flex h-20 items-center justify-center gap-1">
          <Icon name="logo" size={56} />
          <div className="h-0 w-3 rounded border-[1.5px] border-text-positive"></div>
          <Icon name="checkmarkOutline" className="text-text-positive" size={18} />
          <div className="h-0 w-3 rounded border-[1.5px] border-text-positive"></div>
          <Icon name={WalletLogo[type]} size={56} />
        </div>
      ),
    });

    onComplete();
  };

  const goBack = () => {
    reset();
    onBack();
  };

  const Title = {
    [WalletType.WALLET_CONNECT]: t('onboarding.walletConnect.title'),
    [WalletType.NOVA_WALLET]: t('onboarding.novaWallet.title'),
  };

  return (
    <div className="flex h-full w-full items-stretch">
      <div className="flex w-[472px] flex-col">
        <Modal.Title>{Title[type]}</Modal.Title>
        <div className="flex flex-col px-5 py-4">
          <SmallTitleText className="mb-6">{t('onboarding.walletConnect.manageTitle')}</SmallTitleText>

          <form className="flex h-full flex-col gap-4" onSubmit={handleSubmit(submitHandler)}>
            <Controller
              name="walletName"
              control={control}
              rules={{ required: true, maxLength: 256 }}
              render={({ field: { onChange, value } }) => (
                <Field text={t('onboarding.walletNameLabel')}>
                  <Input
                    placeholder={t('onboarding.walletNamePlaceholder')}
                    invalid={Boolean(errors.walletName)}
                    value={value}
                    onChange={onChange}
                  />
                  <InputHint variant="error" active={errors.walletName?.type === ErrorType.MAX_LENGTH}>
                    {t('onboarding.watchOnly.walletNameMaxLenError')}
                  </InputHint>
                  <InputHint variant="error" active={errors.walletName?.type === ErrorType.REQUIRED}>
                    {t('onboarding.watchOnly.walletNameRequiredError')}
                  </InputHint>
                </Field>
              )}
            />

            <div className="flex flex-1 items-end justify-between">
              <Button variant="text" onClick={goBack}>
                {t('onboarding.backButton')}
              </Button>

              <Button type="submit" disabled={!isValid}>
                {t('onboarding.continueButton')}
              </Button>
            </div>
          </form>
        </div>
      </div>

      <div className="flex w-[472px] flex-col gap-y-6 rounded-r-lg bg-input-background-disabled py-4">
        <SmallTitleText className="mt-15 px-5">{t('onboarding.vault.accountsTitle')}</SmallTitleText>
        <MultiAccountsList accounts={accounts} className="h-[416px]" />
      </div>
    </div>
  );
};
