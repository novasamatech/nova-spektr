import { u8aToHex } from '@polkadot/util';
import { useStoreMap, useUnit } from 'effector-react';
import { useEffect, useMemo, useState } from 'react';
import { Controller, type SubmitHandler, useForm } from 'react-hook-form';

import {
  AccountType,
  type Chain,
  CryptoType,
  CryptoTypeString,
  ErrorType,
  SigningType,
  WalletType,
} from '@/shared/core';
import { useI18n } from '@/shared/i18n';
import { nonNullable, nullable } from '@/shared/lib/utils';
import { pjsSchema } from '@/shared/polkadotjs-schemas';
import { Button, FootnoteText, IconButton, InputHint, Loader, SmallTitleText } from '@/shared/ui';
import { ConsensusAccountsList } from '@/shared/ui-entities';
import { Box, Field, Input, Modal, ScrollArea } from '@/shared/ui-kit';
import { identity as identityModel, identityService } from '@/domains/network';
import { networkModel, networkUtils } from '@/entities/network';
import { type SeedInfo } from '@/entities/transaction';
import { walletModel } from '@/entities/wallet';
import { IDENTITY_CHAIN } from '../lib/constants';
import { pairingFormModel } from '../model/pairing-form-model';

type WalletForm = {
  walletName: string;
};

type Props = {
  seedInfo: SeedInfo;
  onBack: () => void;
  onClose: () => void;
  onComplete: () => void;
};

export const ManageSingleshard = ({ seedInfo, onBack, onClose, onComplete }: Props) => {
  const { t } = useI18n();

  const allChains = useUnit(networkModel.$chains);
  const identityPending = useUnit(pairingFormModel.$identityPending);

  const [chains, setChains] = useState<Chain[]>([]);

  const {
    handleSubmit,
    control,
    reset,
    formState: { errors, isValid },
  } = useForm<WalletForm>({
    mode: 'onChange',
    defaultValues: { walletName: seedInfo.name || '' },
  });

  const accountId = pjsSchema.helpers.toAccountId(u8aToHex(seedInfo.multiSigner?.public));

  const accounts = useMemo(() => {
    return chains.map(chain => [chain, accountId] as const);
  }, [chains, accountId]);

  const identityName = useStoreMap({
    store: identityModel.$list,
    keys: [accounts.at(0)],
    fn: (identity, [account]) => {
      if (nullable(account)) return null;

      const accountIdentity = identity[IDENTITY_CHAIN]?.[accountId];

      return accountIdentity ? identityService.getFullName(accountIdentity) : null;
    },
  });

  const isEthereumBased = seedInfo.multiSigner?.MultiSigner === CryptoTypeString.ECDSA;

  useEffect(() => {
    const chainList = Object.values(allChains);
    const filteredChains = chainList.filter(c => {
      return isEthereumBased ? networkUtils.isEthereumBased(c.options) : !networkUtils.isEthereumBased(c.options);
    });

    setChains(filteredChains);
  }, []);

  const createWallet: SubmitHandler<WalletForm> = ({ walletName }) => {
    if (!accountId || accountId.length === 0) return;

    walletModel.events.createSingleshard({
      wallet: {
        name: walletName,
        rootAccountId: accountId,
        type: WalletType.SINGLE_PARITY_SIGNER,
      },
      accounts: [
        {
          accountId,
          name: walletName.trim(),
          cryptoType: isEthereumBased ? CryptoType.ETHEREUM : CryptoType.SR25519,
          signingType: SigningType.PARITY_SIGNER,
          accountType: AccountType.BASE,
          type: 'universal',
        },
      ],
    });

    onComplete();
  };

  const goBack = () => {
    reset();
    onBack();
  };

  return (
    <div className="flex h-full w-full">
      <div className="flex w-[472px] flex-col">
        <Modal.Title>{t('onboarding.vault.title')}</Modal.Title>
        <div className="flex grow flex-col gap-6">
          <div className="px-5 pt-6">
            <SmallTitleText>{t('onboarding.vault.manageTitle')}</SmallTitleText>
          </div>

          <form className="flex grow flex-col gap-4" onSubmit={handleSubmit(createWallet)}>
            <Controller
              name="walletName"
              control={control}
              rules={{ required: true, maxLength: 256 }}
              render={({ field: { onChange, value } }) => (
                <div className="px-5">
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
                          pallet={value.trim() === identityName ? 'primary' : 'secondary'}
                          disabled={value.trim() === identityName}
                          onClick={() => onChange(identityName)}
                        >
                          {identityName}
                        </Button>
                      </Box>
                    )}
                  </Field>
                </div>
              )}
            />

            <div className="grow" />

            <Modal.Footer>
              <Button variant="text" onClick={goBack}>
                {t('onboarding.backButton')}
              </Button>

              <div className="grow" />

              <Button type="submit" disabled={!isValid}>
                {t('onboarding.continueButton')}
              </Button>
            </Modal.Footer>
          </form>
        </div>
      </div>

      <div className="relative flex w-[472px] flex-col gap-y-6 rounded-r-lg bg-input-background-disabled pt-4">
        <IconButton name="close" size={20} className="absolute top-3 right-3 m-1" onClick={onClose} />

        <SmallTitleText className="mt-15 px-5">{t('onboarding.vault.accountsTitle')}</SmallTitleText>
        <div className="h-full min-h-0">
          <ScrollArea>
            <ConsensusAccountsList accounts={accounts} bgColor="bg-background-default" />
          </ScrollArea>
        </div>
      </div>
    </div>
  );
};
