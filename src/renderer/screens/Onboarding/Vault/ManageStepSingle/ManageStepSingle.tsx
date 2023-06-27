import cn from 'classnames';
import { useEffect, useState } from 'react';
import { Controller, useForm, SubmitHandler } from 'react-hook-form';
import { u8aToHex } from '@polkadot/util';

import { useI18n } from '@renderer/context/I18nContext';
import { Chain } from '@renderer/domain/chain';
import { ErrorType, SigningType } from '@renderer/domain/shared-kernel';
import { useChains } from '@renderer/services/network/chainsService';
import { Button, Input, InputHint, HeaderTitleText, SmallTitleText } from '@renderer/components/ui-redesign';
import { SeedInfo } from '@renderer/components/common/QrCode/QrReader/common/types';
import { useAccount } from '@renderer/services/account/accountService';
import { createAccount } from '@renderer/domain/account';
import AccountsList from '@renderer/components/common/AccountsList/AccountsList';

type WalletForm = {
  walletName: string;
};

type Props = {
  seedInfo: SeedInfo[];
  onBack: () => void;
  onComplete: () => void;
};

const ManageStepSingle = ({ seedInfo, onBack, onComplete }: Props) => {
  const { t } = useI18n();
  const accountId = u8aToHex(seedInfo[0].multiSigner?.public);
  const { addAccount, setActiveAccount } = useAccount();

  const { getChainsData, sortChains } = useChains();

  const [chains, setChains] = useState<Chain[]>([]);

  const {
    handleSubmit,
    control,
    reset,
    formState: { errors, isValid },
  } = useForm<WalletForm>({
    mode: 'onChange',
    defaultValues: { walletName: seedInfo[0].name || '' },
  });

  useEffect(() => {
    getChainsData().then((chains) => setChains(sortChains(chains)));
  }, []);

  const submitHandler: SubmitHandler<WalletForm> = async ({ walletName }) => {
    if (!accountId || accountId.length === 0) return;

    const newAccount = createAccount({
      name: walletName.trim(),
      signingType: SigningType.PARITY_SIGNER,
      accountId,
    });

    const id = await addAccount(newAccount);
    setActiveAccount(id);
    reset();
    onComplete();
  };

  const goBack = () => {
    reset();
    onBack();
  };

  return (
    <>
      <div className="w-[472px] flex flex-col px-5 py-4 bg-white rounded-l-lg">
        <HeaderTitleText className="mb-10">{t('onboarding.vault.title')}</HeaderTitleText>
        <SmallTitleText className="mb-6">{t('onboarding.vault.manageTitle')}</SmallTitleText>

        <form className="flex flex-col gap-4 h-full" onSubmit={handleSubmit(submitHandler)}>
          <Controller
            name="walletName"
            control={control}
            rules={{ required: true, maxLength: 256 }}
            render={({ field: { onChange, value } }) => (
              <div>
                <Input
                  wrapperClass={cn('flex items-center')}
                  label={t('onboarding.walletNameLabel')}
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
              </div>
            )}
          />

          <div className="flex flex-1 justify-between items-end">
            <Button variant="text" onClick={goBack}>
              {t('onboarding.backButton')}
            </Button>

            <Button type="submit" disabled={!isValid}>
              {t('onboarding.continueButton')}
            </Button>
          </div>
        </form>
      </div>

      <div className="w-[472px] flex flex-col bg-input-background-disabled px-3 py-4 rounded-r-lg">
        <SmallTitleText className="px-2 mt-[52px] mb-6">{t('onboarding.vault.accountsTitle')}</SmallTitleText>
        <AccountsList chains={chains} accountId={accountId} />
      </div>
    </>
  );
};

export default ManageStepSingle;
