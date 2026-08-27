import { useForm } from 'effector-forms';
import { useStoreMap, useUnit } from 'effector-react';
import { type PropsWithChildren } from 'react';

import { TEST_IDS } from '@/shared/constants';
import { type Address } from '@/shared/core';
import { useI18n } from '@/shared/i18n';
import { nonNullable, nullable, toAccountId } from '@/shared/lib/utils';
import { Alert, Button, FootnoteText, IconButton, InputHint, Loader, SmallTitleText } from '@/shared/ui';
import { ChainAccountsList, Identicon } from '@/shared/ui-entities';
import { Box, Field, Input, Modal } from '@/shared/ui-kit';
import { identity as identityModel, identityService } from '@/domains/network';
import { IDENTITY_CHAIN } from '../lib/constants';
import { pairingFormModel } from '../model/form';

import { EmptyState } from './EmptyState';

type Props = PropsWithChildren;

export const PairingFormModal = ({ children }: Props) => {
  const { t } = useI18n();

  const open = useUnit(pairingFormModel.flow.status);
  const chains = useUnit(pairingFormModel.$chains);
  const accountDraft = useUnit(pairingFormModel.$accountDraft);
  const identityPending = useUnit(pairingFormModel.$identityPending);
  const existingWallet = useUnit(pairingFormModel.$existingWallet);

  const {
    fields: { address, walletName },
    eachValid,
    submit,
  } = useForm(pairingFormModel.form);

  const identityName = useStoreMap({
    store: identityModel.$list,
    keys: [address.value],
    fn: (identity, [address]) => {
      const accountIdentity = identity[IDENTITY_CHAIN]?.[toAccountId(address)];

      return accountIdentity ? identityService.getFullName(accountIdentity) : null;
    },
  });

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

              {nonNullable(existingWallet) && (
                <Alert
                  active
                  variant="warn"
                  title={t('onboarding.watchOnly.alreadyAddedTitle')}
                  dataTestId="watch-only-already-added-alert"
                >
                  <Alert.Item withDot={false}>
                    {t('onboarding.watchOnly.alreadyAddedDescription', { name: existingWallet.name })}
                  </Alert.Item>
                  {nullable(existingWallet.hiddenReason) && (
                    <Alert.Item withDot={false}>
                      <Button size="sm" variant="text" onClick={() => pairingFormModel.openExistingWallet()}>
                        {t('onboarding.watchOnly.openExistingWalletButton')}
                      </Button>
                    </Alert.Item>
                  )}
                </Alert>
              )}

              <Field text={t('onboarding.accountAddressLabel')}>
                <Input
                  invalid={address.hasError()}
                  placeholder={t('onboarding.watchOnly.accountAddressPlaceholder')}
                  value={address.value}
                  prefixElement={<Identicon address={address.value as Address} background={false} />}
                  testId={TEST_IDS.ONBOARDING.WALLET_ADDRESS_INPUT}
                  onChange={address.onChange}
                />
                {address.errors.map(({ errorText, rule }) => (
                  <InputHint key={rule} variant="error" active>
                    {t(errorText ?? '')}
                  </InputHint>
                ))}
              </Field>

              <Field text={t('onboarding.walletNameLabel')}>
                <Input
                  placeholder={t('onboarding.walletNamePlaceholder')}
                  invalid={walletName.hasError()}
                  value={walletName.value}
                  testId={TEST_IDS.ONBOARDING.WALLET_NAME_INPUT}
                  onChange={walletName.onChange}
                />

                {walletName.errors.map(({ errorText, rule }) => (
                  <InputHint key={rule} variant="error" active>
                    {t(errorText ?? '')}
                  </InputHint>
                ))}

                {identityPending && (
                  <Box direction="row" gap={2}>
                    <Loader color="primary" />
                    <FootnoteText className="text-text-secondary">{t('onboarding.identitySearch')}</FootnoteText>
                  </Box>
                )}
                {address.isValid && address.isDirty && !identityPending && nullable(identityName) && (
                  <FootnoteText className="text-text-secondary">{t('onboarding.identityNotFound')}</FootnoteText>
                )}
                {!identityPending && nonNullable(identityName) && (
                  <Box direction="column" gap={2}>
                    <FootnoteText className="text-text-secondary">{t('onboarding.identityFound')}</FootnoteText>
                    <Button
                      className="w-fit"
                      size="sm"
                      variant="chip"
                      pallet={walletName.value.trim() === identityName ? 'primary' : 'secondary'}
                      onClick={() => walletName.onChange(identityName)}
                    >
                      {identityName}
                    </Button>
                  </Box>
                )}
              </Field>

              <div className="flex flex-1 items-end justify-between">
                <Button variant="text" testId={TEST_IDS.COMMON.BACK_BUTTON} onClick={() => toggleModal(false)}>
                  {t('onboarding.backButton')}
                </Button>

                <Button
                  type="submit"
                  testId={TEST_IDS.COMMON.CONTINUE_BUTTON}
                  disabled={!eachValid || nonNullable(existingWallet)}
                >
                  {t('onboarding.continueButton')}
                </Button>
              </div>
            </form>
          </div>
          <div className="relative flex min-h-0 w-[50%] flex-col gap-4 rounded-r-lg bg-input-background-disabled pt-4">
            <div className="absolute top-3 right-3 m-1">
              <IconButton name="close" size={20} onClick={() => toggleModal(false)} />
            </div>

            {address.value && address.isValid ? (
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
