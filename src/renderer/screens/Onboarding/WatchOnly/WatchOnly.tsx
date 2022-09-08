import { useEffect, useState } from 'react';
import { Controller, SubmitHandler, useForm } from 'react-hook-form';
import cn from 'classnames';

import { AccountsList } from '@renderer/components/common';
import { BaseModal, Button, ButtonBack, Icon, Identicon, Input } from '@renderer/components/ui';
import { Chain } from '@renderer/domain/chain';
import { ErrorTypes, PublicKey } from '@renderer/domain/shared-kernel';
import { createMainAccount, createSimpleWallet, WalletType } from '@renderer/domain/wallet';
import useToggle from '@renderer/hooks/useToggle';
import { useChains } from '@renderer/services/network/chainsService';
import { useWallet } from '@renderer/services/wallet/walletService';
import { toPublicKey } from '@renderer/utils/address';
import FinalStep from '../FinalStep/FinalStep';

type WalletForm = {
  walletName: string;
  address: string;
};

const WatchOnly = () => {
  const {
    handleSubmit,
    control,
    watch,
    formState: { errors, isValid },
  } = useForm<WalletForm>({
    mode: 'onChange',
    defaultValues: {
      walletName: '',
      address: '',
    },
  });

  const { getChainsData, sortChains } = useChains();
  const { addWallet, setActiveWallet } = useWallet();
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

    const newWallet = createSimpleWallet({
      name: walletName.trim(),
      type: WalletType.WATCH_ONLY,
      mainAccounts: [
        createMainAccount({
          accountId: address,
          publicKey,
        }),
      ],
      chainAccounts: [],
    });

    const walletId = await addWallet(newWallet);

    await setActiveWallet(walletId);
    setIsCompleted(true);
  };

  const validateAddress = (a: string) => !!toPublicKey(a);

  if (isCompleted) {
    return <FinalStep walletType={WalletType.WATCH_ONLY} />;
  }

  const errorButtonText =
    (errors.address && errors.walletName) || Object.values(errors).length === 0
      ? 'Type address and name'
      : errors.address
      ? 'Type or paste an address'
      : errors.walletName && 'Type a wallet name';

  return (
    <>
      <div className="flex items-center gap-x-2.5">
        <ButtonBack />
        <h1 className="text-neutral">Add watch-only Wallet</h1>
      </div>
      <form
        onSubmit={handleSubmit(handleCreateWallet)}
        className="flex h-full flex-col gap-10 justify-center items-center"
      >
        <h2 className="text-2xl leading-relaxed font-normal text-neutral-variant text-center">
          Track the activity of any wallet without injecting
          <br />
          your private key to Omni Enterprise
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
                  label="Wallet name"
                  placeholder="Wallet name"
                  invalid={!!errors.walletName}
                  value={value}
                  onChange={onChange}
                />
              )}
            />
            {!errors.walletName && (
              <p className="uppercase pt-2.5 pb-10 font-bold text-2xs text-shade-40">
                name examples: Main account, My validator, Dotsama crowdloans, etc.
              </p>
            )}
            {errors.walletName?.type === ErrorTypes.MAX_LENGTH && (
              <p className="uppercase pt-2.5 pb-10 font-bold text-2xs text-error">
                Wallet name should be shorter then 256 symbols
              </p>
            )}
            {errors.walletName?.type === ErrorTypes.REQUIRED && (
              <p className="uppercase pt-2.5 pb-10 font-bold text-2xs text-error">Please, enter wallet name</p>
            )}

            <Controller
              name="address"
              control={control}
              rules={{ required: true, validate: validateAddress }}
              render={({ field: { onChange, value } }) => (
                <Input
                  wrapperClass={cn('flex items-center')}
                  invalid={!!errors.address}
                  prefixElement={
                    isValid ? <Identicon address={value} background={false} /> : <Icon as="svg" name="emptyIdenticon" />
                  }
                  suffixElement={
                    <Button
                      variant="outline"
                      pallet="primary"
                      onClick={async () => {
                        const text = await navigator.clipboard.readText();
                        onChange(text.trim());
                      }}
                    >
                      Paste
                    </Button>
                  }
                  label="Account address"
                  placeholder="Enter or paste your account address"
                  value={value}
                  onChange={onChange}
                />
              )}
            />
            {errors.address && (
              <p className="uppercase pt-2.5 pb-10 font-bold text-2xs text-error">
                The entered address is not a valid one, please type or paste it again
              </p>
            )}
          </div>
          <div className="flex flex-col bg-white shadow-surface rounded-2lg w-[480px] h-[310px]">
            <div className="p-4">
              <h3 className="text-neutral font-semibold">Your accounts will be showing up here</h3>
            </div>
            <AccountsList chains={chains} publicKey={publicKey} limit={publicKey && 4} />
            {publicKey && (
              <div>
                <Button
                  weight="md"
                  className="w-content p-4 mt-2 underline underline-offset-2"
                  onClick={toggleModal}
                  variant="text"
                  pallet="primary"
                  disabled={!!errors.address}
                >
                  Check your accounts
                </Button>
              </div>
            )}
          </div>
        </div>

        <div className="flex justify-center items-center gap-4">
          <Button type="submit" weight="lg" variant="fill" pallet="primary" disabled={!isValid}>
            {isValid ? 'Yes, these are my accounts' : errorButtonText}
          </Button>
        </div>
      </form>

      <BaseModal
        closeButton
        className="p-4 max-w-2xl"
        title="Here are your accounts"
        description="Following accounts have been successfully read"
        isOpen={isModalOpen}
        onClose={toggleModal}
      >
        <AccountsList className="pt-6 -mx-4" chains={chains} publicKey={publicKey} />
      </BaseModal>
    </>
  );
};

export default WatchOnly;
