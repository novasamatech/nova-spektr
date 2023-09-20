import cn from 'classnames';
import { useEffect, useState } from 'react';
import { Controller, useForm, SubmitHandler } from 'react-hook-form';

import { useI18n } from '@renderer/app/providers';
import { Chain } from '@renderer/entities/chain';
import { AccountId, ErrorType, SigningType, WalletType } from '@renderer/domain/shared-kernel';
import { useChains } from '@renderer/entities/network';
import { Button, Input, InputHint, HeaderTitleText, SmallTitleText } from '@renderer/shared/ui';
import { useAccount, createAccount } from '@renderer/entities/account';
import { useWallet } from '@renderer/entities/wallet';
import { toAccountId } from '@renderer/shared/lib/utils';
import { MultiAccountList } from '@renderer/entities/account/ui/MultiAccountsList/MultiAccountsList';

type WalletForm = {
  walletName: string;
};

type Props = {
  accounts: string[];
  pairingTopic: string;
  sessionTopic: string;
  onBack: () => void;
  onComplete: () => void;
};

const ManageStep = ({ accounts, pairingTopic, sessionTopic, onBack, onComplete }: Props) => {
  const { t } = useI18n();
  const { addAccount, setActiveAccount } = useAccount();
  const { addWallet } = useWallet();

  const { getChainsData, sortChains } = useChains();

  const [chains, setChains] = useState<Chain[]>([]);
  const [accountsList, setAccountsList] = useState<{ chain: Chain; accountId: AccountId }[]>([]);

  const {
    handleSubmit,
    control,
    reset,
    formState: { errors, isValid },
  } = useForm<WalletForm>({
    mode: 'onChange',
    defaultValues: { walletName: '' },
  });

  useEffect(() => {
    getChainsData().then((chains) => setChains(sortChains(chains)));
  }, []);

  useEffect(() => {
    const list = chains.reduce<{ chain: Chain; accountId: AccountId }[]>((acc, chain) => {
      const account = accounts.find((account) => {
        const [_, chainId] = account.split(':');

        return chain.chainId.includes(chainId);
      });

      const [_, _chainId, address] = account?.split(':') || [];

      if (address) {
        const accountId = toAccountId(address);

        acc.push({
          chain,
          accountId,
        });
      }

      return acc;
    }, []);

    setAccountsList(list.filter(Boolean));
  }, [chains.length]);

  const submitHandler: SubmitHandler<WalletForm> = async ({ walletName }) => {
    const walletId = await addWallet({
      name: walletName.trim(),
      type: WalletType.WALLET_CONNECT,
    });

    accounts.forEach(async (account) => {
      const [_, chainId, address] = account.split(':');
      const chain = chains.find((chain) => chain.chainId.includes(chainId));
      const accountId = toAccountId(address);

      const id = await addAccount(
        createAccount({
          // eslint-disable-next-line i18next/no-literal-string
          name: `${walletName.trim()} - ${chain?.name}`,
          signingType: SigningType.WALLET_CONNECT,
          accountId,
          chainId: chain?.chainId,
          walletId,
          signingExtras: {
            pairingTopic,
            sessionTopic,
          },
        }),
      );

      setActiveAccount(id);
    });
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
        <HeaderTitleText className="mb-10">{t('onboarding.walletConnect.title')}</HeaderTitleText>
        <SmallTitleText className="mb-6">{t('onboarding.walletConnect.manageTitle')}</SmallTitleText>

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
        <MultiAccountList accounts={accountsList} />
      </div>
    </>
  );
};

export default ManageStep;
