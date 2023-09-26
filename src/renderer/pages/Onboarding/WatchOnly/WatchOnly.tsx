import cn from 'classnames';
import { useEffect, useState } from 'react';
import { Controller, SubmitHandler, useForm } from 'react-hook-form';

import {
  Icon,
  Identicon,
  BaseModal,
  Button,
  Input,
  InputHint,
  HeaderTitleText,
  SmallTitleText,
} from '@renderer/shared/ui';
import { useI18n } from '@renderer/app/providers';
import { Chain } from '@renderer/entities/chain';
import { ErrorType, AccountId, SigningType } from '@renderer/domain/shared-kernel';
import { chainsService } from '@renderer/entities/network';
import { toAccountId, validateAddress, DEFAULT_TRANSITION } from '@renderer/shared/lib/utils';
import EmptyState from './EmptyState';
import { createAccount, useAccount, AccountsList } from '@renderer/entities/account';
import { useToggle } from '@renderer/shared/lib/hooks';

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

  const { addAccount, setActiveAccount } = useAccount();

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
    const chains = chainsService.getChainsData();

    setChains(chainsService.sortChains(chains));
  }, []);

  const createWallet: SubmitHandler<WalletForm> = ({ walletName, address }) => {
    const newAccount = createAccount({
      name: walletName.trim(),
      signingType: SigningType.WATCH_ONLY,
      accountId: toAccountId(address),
    });

    addAccount(newAccount).then(setActiveAccount);
    closeWowModal({ complete: true });
  };

  const closeWowModal = (params?: { complete: boolean }) => {
    toggleIsModalOpen();

    setTimeout(params?.complete ? onComplete : onClose, DEFAULT_TRANSITION);
  };

  return (
    <BaseModal
      contentClass="flex h-full"
      panelClass="w-[944px] h-[576px]"
      isOpen={isModalOpen}
      closeButton
      onClose={closeWowModal}
    >
      <div className="w-[472px] flex flex-col px-5 py-4 bg-white rounded-l-lg">
        <HeaderTitleText className="mb-10">{t('onboarding.watchOnly.title')}</HeaderTitleText>
        <SmallTitleText className="mb-6">{t('onboarding.watchOnly.manageTitle')}</SmallTitleText>

        <form className="flex flex-col gap-4 h-full" onSubmit={handleSubmit(createWallet)}>
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

          <div className="flex flex-1 justify-between items-end">
            <Button variant="text" onClick={() => closeWowModal()}>
              {t('onboarding.backButton')}
            </Button>

            <Button type="submit" disabled={!isValid}>
              {t('onboarding.continueButton')}
            </Button>
          </div>
        </form>
      </div>

      <div className="w-[472px] flex flex-col bg-input-background-disabled px-3 py-4 rounded-r-lg">
        {accountId && accountId.length > 12 ? (
          <>
            <SmallTitleText className="px-2 mt-[52px] mb-6">{t('onboarding.watchOnly.accountsTitle')}</SmallTitleText>
            <AccountsList chains={chains} accountId={accountId} />
          </>
        ) : (
          <EmptyState />
        )}
      </div>
    </BaseModal>
  );
};

export default WatchOnly;
