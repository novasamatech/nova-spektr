import { u8aToHex } from '@polkadot/util';
import { useUnit } from 'effector-react';
import { useEffect, useState } from 'react';
import { Controller, type SubmitHandler, useForm } from 'react-hook-form';

import { type Chain } from '@/shared/core';
import {
  AccountType,
  ChainType,
  CryptoType,
  CryptoTypeString,
  ErrorType,
  SigningType,
  WalletType,
} from '@/shared/core';
import { useI18n } from '@/shared/i18n';
import { Button, HeaderTitleText, IconButton, InputHint, SmallTitleText } from '@/shared/ui';
import { Field, Input } from '@/shared/ui-kit';
import { networkModel, networkUtils } from '@/entities/network';
import { type SeedInfo } from '@/entities/transaction';
import { AccountsList, walletModel } from '@/entities/wallet';

type WalletForm = {
  walletName: string;
};

type Props = {
  seedInfo: SeedInfo[];
  onBack: () => void;
  onClose: () => void;
  onComplete: () => void;
};

export const ManageSingleshard = ({ seedInfo, onBack, onClose, onComplete }: Props) => {
  const { t } = useI18n();

  const allChains = useUnit(networkModel.$chains);

  const [chains, setChains] = useState<Chain[]>([]);

  const accountId = u8aToHex(seedInfo[0].multiSigner?.public);
  const {
    handleSubmit,
    control,
    reset,
    formState: { errors, isValid },
  } = useForm<WalletForm>({
    mode: 'onChange',
    defaultValues: { walletName: seedInfo[0].name || '' },
  });

  const isEthereumBased = seedInfo[0].multiSigner?.MultiSigner === CryptoTypeString.ECDSA;

  useEffect(() => {
    const chainList = Object.values(allChains);
    const filteredChains = chainList.filter((c) => {
      return isEthereumBased ? networkUtils.isEthereumBased(c.options) : !networkUtils.isEthereumBased(c.options);
    });

    setChains(filteredChains);
  }, []);

  const createWallet: SubmitHandler<WalletForm> = async ({ walletName }) => {
    if (!accountId || accountId.length === 0) return;

    walletModel.events.singleshardCreated({
      external: false,
      wallet: {
        name: walletName,
        type: WalletType.SINGLE_PARITY_SIGNER,
        signingType: SigningType.PARITY_SIGNER,
      },
      accounts: [
        {
          accountId,
          name: walletName.trim(),
          cryptoType: isEthereumBased ? CryptoType.ETHEREUM : CryptoType.SR25519,
          chainType: isEthereumBased ? ChainType.ETHEREUM : ChainType.SUBSTRATE,
          type: AccountType.BASE,
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
    <>
      <div className="flex w-[472px] flex-col rounded-l-lg bg-white px-5 py-4">
        <HeaderTitleText className="mb-10">{t('onboarding.vault.title')}</HeaderTitleText>
        <SmallTitleText className="mb-6">{t('onboarding.vault.manageTitle')}</SmallTitleText>

        <form className="flex h-full flex-col gap-4" onSubmit={handleSubmit(createWallet)}>
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

      <div className="relative flex w-[472px] flex-col gap-y-6 rounded-r-lg bg-input-background-disabled py-4">
        <IconButton name="close" size={20} className="absolute right-3 top-3 m-1" onClick={() => onClose()} />

        <SmallTitleText className="mt-[52px] px-5">{t('onboarding.vault.accountsTitle')}</SmallTitleText>
        <AccountsList chains={chains} accountId={accountId} className="h-[424px] py-2" />
      </div>
    </>
  );
};
