import { useForm } from 'effector-forms';
import { useStoreMap, useUnit } from 'effector-react';
import { type FormEvent } from 'react';

import { WalletType } from '@/shared/core';
import { useI18n } from '@/shared/i18n';
import { nonNullable, nullable } from '@/shared/lib/utils';
import { Button, FootnoteText, InputHint, Loader, SmallTitleText } from '@/shared/ui';
import { Box, Field, Input, Modal } from '@/shared/ui-kit';
import { identity as identityModel, identityService } from '@/domains/network';
import { MultiAccountsList } from '@/entities/wallet';
import { IDENTITY_CHAIN } from '../lib/constants';
import { type WalletTypeName } from '../lib/types';
import { pairingFormModel } from '../model/form';

type Props = {
  type: WalletTypeName;
  onBack: () => void;
};

export const PairingForm = ({ type, onBack }: Props) => {
  const { t } = useI18n();

  const session = useUnit(pairingFormModel.$session);
  const accounts = useUnit(pairingFormModel.$accounts);
  const identityPending = useUnit(pairingFormModel.$identityPending);

  const { fields, submit, reset, isValid } = useForm(pairingFormModel.form);

  const identityName = useStoreMap({
    store: identityModel.$list,
    keys: [accounts.at(0)],
    fn: (identity, [account]) => {
      if (nullable(account)) return null;

      const accountIdentity = identity[IDENTITY_CHAIN]?.[account.accountId];

      return accountIdentity ? identityService.getFullName(accountIdentity) : null;
    },
  });

  if (nullable(session)) {
    return (
      <Box fillContainer verticalAlign="center" horizontalAlign="center">
        <Loader color="primary" />
      </Box>
    );
  }

  const submitForm = (event: FormEvent) => {
    event.preventDefault();
    submit();
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
        <div className="flex h-full flex-col px-5 py-4">
          <SmallTitleText className="mb-6">{t('onboarding.walletConnect.manageTitle')}</SmallTitleText>

          <form className="flex h-full flex-col gap-4" onSubmit={submitForm}>
            <Field text={t('onboarding.walletNameLabel')}>
              <Input
                autoFocus
                placeholder={t('onboarding.walletNamePlaceholder')}
                invalid={fields.walletName.hasError()}
                value={fields.walletName.value}
                onChange={fields.walletName.onChange}
              />
              <InputHint variant="error" active={fields.walletName.hasError()}>
                {t(fields.walletName.errorText())}
              </InputHint>

              {identityPending && (
                <Box direction="row" gap={2}>
                  <Loader color="primary" />
                  <FootnoteText className="text-text-secondary">{t('onboarding.identitySearch')}</FootnoteText>
                </Box>
              )}
              {!identityPending && nullable(identityName) && (
                <FootnoteText className="text-text-secondary">{t('onboarding.identityNotFound')}</FootnoteText>
              )}
              {!identityPending && nonNullable(identityName) && (
                <Box direction="column" gap={2}>
                  <FootnoteText className="text-text-secondary">{t('onboarding.identityFound')}</FootnoteText>
                  <Button
                    className="w-fit"
                    size="sm"
                    variant="chip"
                    pallet={fields.walletName.value.trim() === identityName ? 'primary' : 'secondary'}
                    onClick={() => fields.walletName.onChange(identityName)}
                  >
                    {identityName}
                  </Button>
                </Box>
              )}
            </Field>

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
