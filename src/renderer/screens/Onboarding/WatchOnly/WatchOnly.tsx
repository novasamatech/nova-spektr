import cn from 'classnames';
import { useEffect, useState } from 'react';
import { Controller, SubmitHandler, useForm } from 'react-hook-form';

import { Icon, Identicon } from '@renderer/components/ui';
import { useI18n } from '@renderer/context/I18nContext';
import { Chain } from '@renderer/domain/chain';
import { ErrorType, AccountId, SigningType } from '@renderer/domain/shared-kernel';
import { useChains } from '@renderer/services/network/chainsService';
import { toAccountId, validateAddress } from '@renderer/shared/utils/address';
import { BaseModal, Button, Input, InputHint, HeaderTitleText, SmallTitleText } from '@renderer/components/ui-redesign';
import EmptyState from './EmptyState';
import { createAccount } from '@renderer/domain/account';
import { useAccount } from '@renderer/services/account/accountService';
import AccountsList from '@renderer/components/common/AccountsList/AccountsList';

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

  const { getChainsData, sortChains } = useChains();
  const { addAccount } = useAccount();

  const [chains, setChains] = useState<Chain[]>([]);
  const [accountId, setAccountId] = useState<AccountId>();

  const {
    handleSubmit,
    control,
    watch,
    reset,
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
    getChainsData().then((chains) => setChains(sortChains(chains)));
  }, []);

  const createWallet: SubmitHandler<WalletForm> = async ({ walletName, address }) => {
    const newAccount = createAccount({
      name: walletName.trim(),
      signingType: SigningType.WATCH_ONLY,
      accountId: toAccountId(address),
    });

    await addAccount(newAccount);

    reset();
    onComplete();
  };

  const closeModal = () => {
    reset();
    onClose();
  };

  return (
    <BaseModal
      contentClass="flex h-full"
      panelClass="w-[944px] h-[576px]"
      isOpen={isOpen}
      closeButton
      onClose={closeModal}
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
            <Button variant="text" onClick={closeModal}>
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
