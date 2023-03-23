import cn from 'classnames';
import { useEffect, useState } from 'react';
import { Controller, SubmitHandler, useForm } from 'react-hook-form';
import { u8aToHex } from '@polkadot/util';

import { AccountsList } from '@renderer/components/common';
import { BaseModal, Button, Identicon, Input, InputHint } from '@renderer/components/ui';
import { useI18n } from '@renderer/context/I18nContext';
import { Chain } from '@renderer/domain/chain';
import { ErrorType, SigningType } from '@renderer/domain/shared-kernel';
import { useToggle } from '@renderer/shared/hooks';
import { useChains } from '@renderer/services/network/chainsService';
import { useAccount } from '@renderer/services/account/accountService';
import { createAccount } from '@renderer/domain/account';
import { SeedInfo } from '@renderer/components/common/QrCode/QrReader/common/types';
import { formatAddress } from '@renderer/shared/utils/address';

type AccountForm = {
  name: string;
};

type Props = {
  qrData: SeedInfo[];
  onNextStep: () => void;
};

const StepThreeSingle = ({ qrData, onNextStep }: Props) => {
  const { t } = useI18n();
  const publicKey = u8aToHex(qrData[0].multiSigner?.public);
  const address = formatAddress(publicKey, 0);

  const {
    handleSubmit,
    control,
    formState: { errors, isValid },
  } = useForm<AccountForm>({
    mode: 'onChange',
    defaultValues: {
      name: qrData[0].name || '',
    },
  });

  const { getChainsData, sortChains } = useChains();
  const { addAccount } = useAccount();
  const [isModalOpen, toggleModal] = useToggle();

  const [chains, setChains] = useState<Chain[]>([]);

  useEffect(() => {
    (async () => {
      const chains = await getChainsData();
      setChains(sortChains(chains));
    })();
  }, []);

  const handleCreateAccount: SubmitHandler<AccountForm> = async ({ name }) => {
    if (!publicKey || publicKey.length === 0) return;

    const newAccount = createAccount({
      name: name.trim(),
      signingType: SigningType.PARITY_SIGNER,
      accountId: address,
    });

    await addAccount(newAccount);
    onNextStep();
  };

  const errorButtonText =
    (errors.name || Object.values(errors).length === 0) && t('onboarding.watchonly.nameRequiredError');

  return (
    <form
      className="flex h-full flex-col gap-10 justify-center items-center"
      onSubmit={handleSubmit(handleCreateAccount)}
    >
      <h2 className="text-2xl leading-relaxed font-normal text-neutral-variant text-center">
        {t('onboarding.paritySigner.addSingleParitySignerDescription1')}
      </h2>
      <div className="flex gap-10">
        <div className="flex flex-col w-[480px] h-[310px] p-4 bg-white shadow-surface rounded-2lg">
          <Controller
            name="name"
            control={control}
            rules={{ required: true, maxLength: 256 }}
            render={({ field: { onChange, value } }) => (
              <Input
                wrapperClass={cn('flex items-center')}
                label={t('onboarding.walletNameLabel')}
                placeholder={t('onboarding.walletNamePlaceholder')}
                invalid={Boolean(errors.name)}
                value={value}
                onChange={onChange}
              />
            )}
          />

          <InputHint variant="hint" active={!errors.name} className="pt-2.5 pb-10">
            {t('onboarding.walletNameExample')}
          </InputHint>
          <InputHint variant="error" active={errors.name?.type === ErrorType.MAX_LENGTH} className="pt-2.5 pb-10">
            {t('onboarding.watchonly.walletNameMaxLenError')}
          </InputHint>
          <InputHint variant="error" active={errors.name?.type === ErrorType.REQUIRED} className="pt-2.5 pb-10">
            {t('onboarding.watchonly.walletNameRequiredError')}
          </InputHint>

          <Input
            wrapperClass={cn('flex items-center')}
            label={t('onboarding.accountAddressLabel')}
            value={address}
            prefixElement={<Identicon address={address} background={false} />}
            disabled
          />
        </div>

        <div className="flex flex-col bg-white shadow-surface rounded-2lg w-[480px] h-[310px]">
          <div className="p-4">
            <h3 className="text-neutral font-semibold">{t('onboarding.paritySigner.yourAccountsLabel')}</h3>
            <p className="text-neutral-variant text-xs">{t('onboarding.paritySigner.yourAccountsDescription')}</p>
          </div>

          <AccountsList chains={chains} publicKey={publicKey} limit={publicKey && 4} />

          {publicKey && (
            <>
              <div>
                <Button
                  weight="md"
                  className="w-content p-4 mt-2 underline underline-offset-2"
                  variant="text"
                  pallet="primary"
                  onClick={toggleModal}
                >
                  {t('onboarding.checkAccountsButton')}
                </Button>
              </div>

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
          )}
        </div>
      </div>

      <div className="flex justify-center items-center gap-4">
        <Button type="submit" weight="lg" variant="fill" pallet="primary" disabled={!isValid}>
          {isValid ? t('onboarding.confirmAccountsListButton') : errorButtonText}
        </Button>
      </div>
    </form>
  );
};

export default StepThreeSingle;
