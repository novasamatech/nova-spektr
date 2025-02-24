import { useForm } from 'effector-forms';
import { useUnit } from 'effector-react';
import { type PropsWithChildren } from 'react';

import { TEST_IDS } from '@/shared/constants';
import { useI18n } from '@/shared/i18n';
import { Button, Icon, IconButton, Identicon, InputHint, SmallTitleText } from '@/shared/ui';
import { ChainAccountsList } from '@/shared/ui-entities';
import { Box, Field, Input, Modal } from '@/shared/ui-kit';
import { pairingFormModel } from '../model/form';

import { EmptyState } from './EmptyState';

type Props = PropsWithChildren;

export const PairingFormModal = ({ children }: Props) => {
  const { t } = useI18n();
  const open = useUnit(pairingFormModel.flow.status);
  const { fields, eachValid, submit } = useForm(pairingFormModel.form);
  const accountDraft = useUnit(pairingFormModel.$accountDraft);
  const chains = useUnit(pairingFormModel.$chains);

  const toggleModal = (open: boolean) => {
    if (open) {
      pairingFormModel.flow.open();
    } else {
      pairingFormModel.flow.close();
    }
  };

  const accounts = chains.map(chain => [chain, accountDraft.accountId] as const);

  return (
    <Modal size="xl" isOpen={open} onToggle={toggleModal}>
      <Modal.Trigger>{children}</Modal.Trigger>
      <Modal.Content disableScroll>
        <Box direction="row" height="576px">
          <div className="flex w-[50%] flex-col">
            <Modal.Title>{t('onboarding.watchOnly.title')}</Modal.Title>
            <form
              className="flex h-full flex-col gap-4 px-5 py-4"
              onSubmit={e => {
                e.preventDefault();
                submit();
              }}
            >
              <SmallTitleText className="mb-2">{t('onboarding.watchOnly.manageTitle')}</SmallTitleText>

              <Field text={t('onboarding.walletNameLabel')}>
                <Input
                  placeholder={t('onboarding.walletNamePlaceholder')}
                  invalid={fields.walletName.hasError()}
                  value={fields.walletName.value}
                  testId={TEST_IDS.ONBOARDING.WALLET_NAME_INPUT}
                  onChange={fields.walletName.onChange}
                />
                {fields.walletName.errors.map(({ errorText, rule }) => {
                  return (
                    <InputHint key={rule} variant="error" active>
                      {t(errorText ?? '')}
                    </InputHint>
                  );
                })}
              </Field>

              <Field text={t('onboarding.accountAddressLabel')}>
                <Input
                  invalid={fields.address.hasError()}
                  placeholder={t('onboarding.watchOnly.accountAddressPlaceholder')}
                  value={fields.address.value}
                  prefixElement={
                    fields.address.isValid ? (
                      <Identicon address={fields.address.value} background={false} />
                    ) : (
                      <Icon name="emptyIdenticon" />
                    )
                  }
                  testId={TEST_IDS.ONBOARDING.WALLET_ADDRESS_INPUT}
                  onChange={fields.address.onChange}
                />
                {fields.address.errors.map(({ errorText, rule }) => {
                  return (
                    <InputHint key={rule} variant="error" active>
                      {t(errorText ?? '')}
                    </InputHint>
                  );
                })}
              </Field>

              <div className="flex flex-1 items-end justify-between">
                <Button variant="text" testId={TEST_IDS.COMMON.BACK_BUTTON} onClick={() => toggleModal(false)}>
                  {t('onboarding.backButton')}
                </Button>

                <Button type="submit" testId={TEST_IDS.COMMON.CONTINUE_BUTTON} disabled={!eachValid}>
                  {t('onboarding.continueButton')}
                </Button>
              </div>
            </form>
          </div>

          <div className="relative flex min-h-0 w-[50%] flex-col gap-4 rounded-r-lg bg-input-background-disabled pt-4">
            <div className="absolute right-3 top-3 m-1">
              <IconButton name="close" size={20} onClick={() => toggleModal(false)} />
            </div>

            {fields.address.value && fields.address.isValid ? (
              <>
                <SmallTitleText className="mt-[52px] px-5">{t('onboarding.watchOnly.accountsTitle')}</SmallTitleText>
                <ChainAccountsList accounts={accounts} />
              </>
            ) : (
              <EmptyState />
            )}
          </div>
        </Box>
      </Modal.Content>
    </Modal>
  );
};
