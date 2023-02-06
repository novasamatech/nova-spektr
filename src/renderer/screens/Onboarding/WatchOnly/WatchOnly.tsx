import cn from 'classnames';
import { useEffect, useState } from 'react';
import { Controller, SubmitHandler, useForm } from 'react-hook-form';

import { AccountsList } from '@renderer/components/common';
import { BaseModal, Button, ButtonBack, Icon, Identicon, Input } from '@renderer/components/ui';
import { useI18n } from '@renderer/context/I18nContext';
import { createAccount } from '@renderer/domain/account';
import { Chain } from '@renderer/domain/chain';
import { ErrorType, PublicKey, SigningType } from '@renderer/domain/shared-kernel';
import { useToggle } from '@renderer/shared/hooks';
import { useAccount } from '@renderer/services/account/accountService';
import { useChains } from '@renderer/services/network/chainsService';
import { pasteAddressHandler, toPublicKey } from '@renderer/shared/hooks/utils/address';
import FinalStep from '../FinalStep/FinalStep';

type WalletForm = {
  walletName: string;
  address: string;
};

const WatchOnly = () => {
  const { t } = useI18n();

  const {
    handleSubmit,
    control,
    watch,
    formState: { errors, isValid },
  } = useForm<WalletForm>({
    mode: 'onChange',
    defaultValues: { walletName: '', address: '' },
  });

  const { getChainsData, sortChains } = useChains();
  const { addAccount } = useAccount();
  const [isModalOpen, toggleModal] = useToggle();

  const [chains, setChains] = useState<Chain[]>([]);
  const [publicKey, setPublicKey] = useState<PublicKey>();

  const [isCompleted, setIsCompleted] = useState(false);
  const address = watch('address');

  useEffect(() => {
    setPublicKey(toPublicKey(address));
  }, [address]);

  useEffect(() => {
    (async () => {
      const chains = await getChainsData();
      setChains(sortChains(chains));
    })();
  }, []);

  const handleCreateWallet: SubmitHandler<WalletForm> = async ({ walletName, address }) => {
    if (!publicKey || publicKey.length === 0) return;

    const newAccount = createAccount({
      name: walletName.trim(),
      signingType: SigningType.WATCH_ONLY,
      accountId: address,
    });

    await addAccount(newAccount);
    setIsCompleted(true);
  };

  const validateAddress = (a: string) => Boolean(toPublicKey(a));

  if (isCompleted) {
    return <FinalStep signingType={SigningType.WATCH_ONLY} />;
  }

  const errorButtonText =
    (errors.address && errors.walletName) || Object.values(errors).length === 0
      ? t('onboarding.watchonly.addressAndNameRequiredError')
      : errors.address
      ? t('onboarding.watchonly.addressRequiredError')
      : errors.walletName && t('onboarding.watchonly.nameRequiredError');

  return (
    <>
      <div className="flex items-center gap-x-2.5">
        <ButtonBack />
        <h1 className="text-neutral">{t('onboarding.watchonly.addWatchOnlyLabel')}</h1>
      </div>
      <form
        className="flex h-full flex-col gap-10 justify-center items-center"
        onSubmit={handleSubmit(handleCreateWallet)}
      >
        <h2 className="text-2xl leading-relaxed font-normal text-neutral-variant text-center">
          {t('onboarding.watchonly.addWatchOnlyDescription1')} <br />{' '}
          {t('onboarding.watchonly.addWatchOnlyDescription2')}
        </h2>
        <div className="flex gap-10">
          <div className="flex flex-col w-[480px] h-[310px] p-4 bg-white shadow-surface rounded-2lg">
            <Controller
              name="walletName"
              control={control}
              rules={{ required: true, maxLength: 256 }}
              render={({ field: { onChange, value } }) => (
                <Input
                  wrapperClass={cn('flex items-center')}
                  label={t('onboarding.walletNameLabel')}
                  placeholder={t('onboarding.walletNamePlaceholder')}
                  invalid={Boolean(errors.walletName)}
                  value={value}
                  onChange={onChange}
                />
              )}
            />
            {!errors.walletName && (
              <p className="uppercase pt-2.5 pb-10 font-bold text-2xs text-shade-40">
                {t('onboarding.walletNameExample')}
              </p>
            )}
            {errors.walletName?.type === ErrorType.MAX_LENGTH && (
              <p className="uppercase pt-2.5 pb-10 font-bold text-2xs text-error">
                {t('onboarding.watchonly.walletNameMaxLenError')}
              </p>
            )}
            {errors.walletName?.type === ErrorType.REQUIRED && (
              <p className="uppercase pt-2.5 pb-10 font-bold text-2xs text-error">
                {t('onboarding.watchonly.walletNameRequiredError')}
              </p>
            )}

            <Controller
              name="address"
              control={control}
              rules={{ required: true, validate: validateAddress }}
              render={({ field: { onChange, value } }) => (
                <Input
                  wrapperClass={cn('flex items-center')}
                  invalid={Boolean(errors.address)}
                  label={t('onboarding.accountAddressLabel')}
                  placeholder={t('onboarding.watchonly.accountAddressPlaceholder')}
                  value={value}
                  prefixElement={
                    isValid ? <Identicon address={value} background={false} /> : <Icon name="emptyIdenticon" />
                  }
                  suffixElement={
                    <Button variant="outline" pallet="primary" onClick={pasteAddressHandler(onChange)}>
                      {t('onboarding.pasteButton')}
                    </Button>
                  }
                  onChange={onChange}
                />
              )}
            />
            {errors.address && (
              <p className="uppercase pt-2.5 pb-10 font-bold text-2xs text-error">
                {t('onboarding.watchonly.accountAddressError')}
              </p>
            )}
          </div>
          <div className="flex flex-col bg-white shadow-surface rounded-2lg w-[480px] h-[310px]">
            <div className="p-4">
              <h3 className="text-neutral font-semibold">{t('onboarding.watchonly.yourAccountsLoadingLabel')}</h3>
            </div>
            <AccountsList chains={chains} publicKey={publicKey} limit={publicKey && 4} />
            {publicKey && (
              <div>
                <Button
                  weight="md"
                  className="w-content p-4 mt-2 underline underline-offset-2"
                  variant="text"
                  pallet="primary"
                  disabled={Boolean(errors.address)}
                  onClick={toggleModal}
                >
                  {t('onboarding.checkAccountsButton')}
                </Button>
              </div>
            )}
          </div>
        </div>

        <div className="flex justify-center items-center gap-4">
          <Button type="submit" weight="lg" variant="fill" pallet="primary" disabled={!isValid}>
            {isValid ? t('onboarding.confirmAccountsListButton') : errorButtonText}
          </Button>
        </div>
      </form>

      <BaseModal
        closeButton
        title={t('onboarding.yourAccountsLabel')}
        description={t('onboarding.readAccountsLabel')}
        isOpen={isModalOpen}
        onClose={toggleModal}
      >
        <AccountsList className="pt-6 -mx-4 max-w-2xl" chains={chains} publicKey={publicKey} />
      </BaseModal>
    </>
  );
};

export default WatchOnly;
