import cn from 'classnames';
import { useUnit } from 'effector-react';
import { useEffect, useState } from 'react';
import { Controller, type SubmitHandler, useForm } from 'react-hook-form';

import { useI18n } from '@app/providers';
import { type AccountId, type Chain } from '@shared/core';
import { AccountType, ChainType, CryptoType, ErrorType, SigningType, WalletType } from '@shared/core';
import { useToggle } from '@shared/lib/hooks';
import { DEFAULT_TRANSITION, isEthereumAccountId, toAccountId, validateAddress } from '@shared/lib/utils';
import {
  BaseModal,
  Button,
  HeaderTitleText,
  Icon,
  IconButton,
  Identicon,
  Input,
  InputHint,
  SmallTitleText,
} from '@shared/ui';
import { networkModel, networkUtils } from '@entities/network';
import { AccountsList, walletModel } from '@entities/wallet';

import { EmptyState } from './EmptyState';

type WalletForm = {
  walletName: string;
  address: string;
};

type Props = {
  isOpen: boolean;
  onClose: () => void;
  onComplete: () => void;
};

const WatchOnly = ({ isOpen, onClose, onComplete }: Props) => {
  const { t } = useI18n();
  const allChains = useUnit(networkModel.$chains);

  const [isModalOpen, toggleIsModalOpen] = useToggle(isOpen);
  const [chains, setChains] = useState<Chain[]>([]);
  const [accountId, setAccountId] = useState<AccountId>();

  useEffect(() => {
    if (isOpen && !isModalOpen) {
      toggleIsModalOpen();
    }

    if (!isOpen && isModalOpen) {
      closeWowModal();
    }
  }, [isOpen]);

  const {
    handleSubmit,
    control,
    watch,
    formState: { errors, isValid },
  } = useForm<WalletForm>({
    mode: 'onChange',
    defaultValues: { walletName: '', address: '' },
  });

  const address = watch('address');

  useEffect(() => {
    setAccountId(toAccountId(address));
  }, [address]);

  useEffect(() => {
    const chainList = Object.values(allChains);

    setChains(
      isEthereumAccountId(accountId) ? chainList.filter((c) => networkUtils.isEthereumBased(c.options)) : chainList,
    );
  }, [accountId]);

  const createWallet: SubmitHandler<WalletForm> = async ({ walletName, address }) => {
    const isEthereum = isEthereumAccountId(accountId);

    walletModel.events.watchOnlyCreated({
      wallet: {
        name: walletName,
        type: WalletType.WATCH_ONLY,
        signingType: SigningType.WATCH_ONLY,
      },
      accounts: [
        {
          name: walletName.trim(),
          accountId: toAccountId(address),
          cryptoType: isEthereum ? CryptoType.ETHEREUM : CryptoType.SR25519,
          chainType: isEthereum ? ChainType.ETHEREUM : ChainType.SUBSTRATE,
          type: AccountType.BASE,
        },
      ],
    });

    closeWowModal({ complete: true });
  };

  const closeWowModal = (params?: { complete: boolean }) => {
    toggleIsModalOpen();

    setTimeout(params?.complete ? onComplete : onClose, DEFAULT_TRANSITION);
  };

  return (
    <BaseModal contentClass="flex h-full" panelClass="w-modal-xl h-modal" isOpen={isModalOpen} onClose={closeWowModal}>
      <div className="flex w-[472px] flex-col rounded-l-lg bg-white px-5 py-4">
        <HeaderTitleText className="mb-10">{t('onboarding.watchOnly.title')}</HeaderTitleText>
        <SmallTitleText className="mb-6">{t('onboarding.watchOnly.manageTitle')}</SmallTitleText>

        <form className="flex h-full flex-col gap-4" onSubmit={handleSubmit(createWallet)}>
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

          <Controller
            name="address"
            control={control}
            rules={{ required: true, validate: validateAddress }}
            render={({ field: { onChange, value } }) => (
              <div>
                <Input
                  wrapperClass={cn('flex items-center')}
                  invalid={Boolean(errors.address)}
                  label={t('onboarding.accountAddressLabel')}
                  placeholder={t('onboarding.watchOnly.accountAddressPlaceholder')}
                  value={value}
                  prefixElement={
                    <div className="mr-2">
                      {isValid ? <Identicon address={value} background={false} /> : <Icon name="emptyIdenticon" />}
                    </div>
                  }
                  onChange={onChange}
                />

                <InputHint variant="error" active={!!errors.address}>
                  {t('onboarding.watchOnly.accountAddressError')}
                </InputHint>
              </div>
            )}
          />

          <div className="flex flex-1 items-end justify-between">
            <Button variant="text" onClick={() => closeWowModal()}>
              {t('onboarding.backButton')}
            </Button>

            <Button type="submit" disabled={!isValid}>
              {t('onboarding.continueButton')}
            </Button>
          </div>
        </form>
      </div>

      <div className="relative flex w-[472px] flex-col gap-y-6 rounded-r-lg bg-input-background-disabled py-4">
        <IconButton name="close" size={20} className="absolute right-3 top-3 m-1" onClick={() => closeWowModal()} />

        {accountId && accountId.length > 12 ? (
          <>
            <SmallTitleText className="mt-[52px] px-5">{t('onboarding.watchOnly.accountsTitle')}</SmallTitleText>
            <AccountsList chains={chains} accountId={accountId} className="h-[440px]" />
          </>
        ) : (
          <EmptyState />
        )}
      </div>
    </BaseModal>
  );
};

export default WatchOnly;
