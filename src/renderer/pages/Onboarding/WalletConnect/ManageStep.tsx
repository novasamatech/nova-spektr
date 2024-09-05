import { useEffect, useState } from 'react';
import { Controller, type SubmitHandler, useForm } from 'react-hook-form';

import { useI18n, useStatusContext } from '@app/providers';
import { chainsService } from '@shared/api/network';
import {
  type AccountId,
  AccountType,
  type Chain,
  ChainType,
  ErrorType,
  type NoID,
  SigningType,
  WalletType,
  type WcAccount,
} from '@shared/core';
import { toAccountId } from '@shared/lib/utils';
import { Button, HeaderTitleText, Icon, Input, InputHint, SmallTitleText } from '@shared/ui';
import { type IconNames } from '@shared/ui/Icon/data';
import { MultiAccountsList, walletModel } from '@entities/wallet';

const WalletLogo: Record<WalletTypeName, IconNames> = {
  [WalletType.WALLET_CONNECT]: 'walletConnectOnboarding',
  [WalletType.NOVA_WALLET]: 'novaWalletOnboarding',
};

type WalletForm = {
  walletName: string;
};

type WalletTypeName = WalletType.NOVA_WALLET | WalletType.WALLET_CONNECT;

type Props = {
  accounts: string[];
  pairingTopic: string;
  sessionTopic: string;
  type: WalletTypeName;
  onBack: () => void;
  onComplete: () => void;
};

export const ManageStep = ({ accounts, type, pairingTopic, sessionTopic, onBack, onComplete }: Props) => {
  const { t } = useI18n();
  const { showStatus } = useStatusContext();

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
    setChains(chainsService.getChainsData({ sort: true }));
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

  // TODO: Rewrite with effector forms
  const submitHandler: SubmitHandler<WalletForm> = async ({ walletName }) => {
    const wcAccounts = accounts.map((account) => {
      const [_, chainId, address] = account.split(':');
      const chain = chains.find((chain) => chain.chainId.includes(chainId));

      return {
        name: walletName.trim(),
        accountId: toAccountId(address),
        type: AccountType.WALLET_CONNECT,
        chainType: ChainType.SUBSTRATE,
        chainId: chain?.chainId,
        signingExtras: { pairingTopic, sessionTopic },
      } as Omit<NoID<WcAccount>, 'walletId'>;
    });

    walletModel.events.walletConnectCreated({
      wallet: {
        name: walletName.trim(),
        type,
        signingType: SigningType.WALLET_CONNECT,
      },
      accounts: wcAccounts,
    });

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
    <>
      <div className="flex w-[472px] flex-col rounded-l-lg bg-white px-5 py-4">
        <HeaderTitleText className="mb-10">{Title[type]}</HeaderTitleText>
        <SmallTitleText className="mb-6">{t('onboarding.walletConnect.manageTitle')}</SmallTitleText>

        <form className="flex h-full flex-col gap-4" onSubmit={handleSubmit(submitHandler)}>
          <Controller
            name="walletName"
            control={control}
            rules={{ required: true, maxLength: 256 }}
            render={({ field: { onChange, value } }) => (
              <div>
                <Input
                  wrapperClass="flex items-center"
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

      <div className="flex w-[472px] flex-col gap-y-6 rounded-r-lg bg-input-background-disabled py-4">
        <SmallTitleText className="mt-[52px] px-5">{t('onboarding.vault.accountsTitle')}</SmallTitleText>
        <MultiAccountsList accounts={accountsList} className="h-[416px]" />
      </div>
    </>
  );
};
