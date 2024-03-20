import { BN } from '@polkadot/util';
import { ReactNode, useEffect, useState } from 'react';
import { Controller, SubmitHandler, useForm } from 'react-hook-form';
import { Trans } from 'react-i18next';
import { useUnit } from 'effector-react';

import { AmountInput, Button, Icon, Identicon, Input, InputHint, Select } from '@shared/ui';
import { useI18n } from '@app/providers';
import { MultisigTxInitStatus } from '@entities/transaction';
import { useMultisigTx } from '@entities/multisig';
import {
  SS58_DEFAULT_PREFIX,
  formatAmount,
  toAccountId,
  toAddress,
  transferableAmount,
  validateAddress,
} from '@shared/lib/utils';
import { getChainOption, getPlaceholder } from '../common/utils';
import { DropdownOption, DropdownResult } from '@shared/ui/types';
import AccountSelectModal from '@pages/Operations/components/modals/AccountSelectModal/AccountSelectModal';
import type { Chain, Account, MultisigAccount, Asset, Address, ChainId, HexString } from '@shared/core';
import { accountUtils } from '@entities/wallet';
import { balanceModel, balanceUtils } from '@entities/balance';
import { sendAssetModel } from '../../model/send-asset';
import { networkModel } from '@entities/network';

const DESCRIPTION_MAX_LENGTH = 120;

export type TransferFormData = {
  amount: string;
  signatory: Address;
  destination: Address;
  description: string;
  destinationChain?: DropdownResult<ChainId>;
};

type Props = {
  chain: Chain;
  network: string;
  account?: Account | MultisigAccount;
  accounts?: Account[];
  signer?: Account;
  asset: Asset;
  nativeToken: Asset;
  addressPrefix: number;
  fee: string;
  feeIsLoading: boolean;
  isXcmTransfer?: boolean;
  isXcmValid?: boolean;
  xcmFee: string;
  deposit: string;
  footer: ReactNode;
  header?: ReactNode;
  getCallHash: () => HexString | undefined;
  onSubmit: () => void;
  onTxChange: (formData: Partial<TransferFormData>) => void;
  destinations: Chain[];
};

export const TransferForm = ({
  account,
  accounts,
  chain,
  signer,
  asset,
  addressPrefix,
  header,
  footer,
  onSubmit,
  onTxChange,
  feeIsLoading,
  fee,
  getCallHash,
  deposit,
  destinations,
  isXcmTransfer,
  isXcmValid,
  xcmFee,
}: Props) => {
  const { t } = useI18n();
  const { getMultisigTxs } = useMultisigTx({});
  const balances = useUnit(balanceModel.$balances);
  const chains = useUnit(networkModel.$chains);

  const [accountBalance, setAccountBalance] = useState('');
  const [signerBalance, setSignerBalance] = useState('');
  const [accountNativeTokenBalance, setAccountNativeTokenBalance] = useState<string>();
  const [signerNativeTokenBalance, setSignerNativeTokenBalance] = useState<string>();

  const [multisigTxExist, setMultisigTxExist] = useState(false);
  const [destinationOptions, setDestinationOptions] = useState<DropdownOption<ChainId | string>[]>([]);
  const [isSelectAccountModalOpen, setSelectAccountModalOpen] = useState(false);

  const isMultisigAccount = account && accountUtils.isMultisigAccount(account);

  const {
    handleSubmit,
    control,
    watch,
    trigger,
    setValue,
    formState: { isValid, isDirty },
  } = useForm<TransferFormData>({
    mode: 'onChange',
    defaultValues: { amount: '', destination: '', signatory: '', description: '' },
  });

  useEffect(() => {
    const destinationOptions = destinations.map(getChainOption);

    if (destinationOptions.length) {
      const [first, ...rest] = destinationOptions;

      setDestinationOptions([
        getPlaceholder(t('transfer.onChainPlaceholder')),
        first,
        getPlaceholder(t('transfer.crossChainPlaceholder')),
        ...rest,
      ]);
    }

    setValue('destinationChain', destinationOptions[0]);
  }, [destinations.length]);

  const amount = watch('amount');
  const destination = watch('destination');
  const description = watch('description');
  const destinationChain = watch('destinationChain');
  const destinationChainAccounts =
    accounts?.filter((a) => {
      return destinationChain?.value && accountUtils.isChainAndCryptoMatch(a, chains[destinationChain.value]);
    }) || [];

  useEffect(() => {
    if (destinationChain) {
      sendAssetModel.events.destinationChainSelected(destinationChain.value);
    }
  }, [destinationChain]);

  useEffect(() => {
    isDirty && trigger('amount');
  }, [accountBalance, signerBalance]);

  useEffect(() => {
    sendAssetModel.events.amountChanged(formatAmount(amount, asset.precision));
  }, [amount]);

  useEffect(() => {
    sendAssetModel.events.accountIdSelected(toAccountId(destination));
  }, [destination]);

  const setupBalances = (
    address: Address,
    callbackNativeToken: (balance: string) => void,
    callbackBalance: (balance: string) => void,
  ) => {
    const accountId = toAccountId(address);

    const balance = balanceUtils.getBalance(balances, accountId, chain.chainId, asset.assetId.toString());
    callbackBalance(balance ? transferableAmount(balance) : '0');

    if (asset.assetId !== 0) {
      const nativeBalance = balanceUtils.getBalance(balances, accountId, chain.chainId, '0');
      callbackNativeToken(nativeBalance ? transferableAmount(nativeBalance) : '0');
    }
  };

  useEffect(() => {
    if (!account) return;

    setupBalances(account.accountId, setAccountNativeTokenBalance, setAccountBalance);
  }, [account]);

  useEffect(() => {
    if (!signer) return;

    setupBalances(signer.accountId, setSignerNativeTokenBalance, setSignerBalance);
  }, [signer]);

  useEffect(() => {
    if (fee !== '0') {
      trigger('amount').then();
    }
  }, [fee]);

  useEffect(() => {
    if (!account || !amount || !validateAddress(destination)) return;

    const dest = toAddress(destination, { prefix: addressPrefix });
    onTxChange({
      destination: dest,
      amount: formatAmount(amount, asset.precision),
      signatory: signer?.accountId,
      destinationChain,
      description: isMultisigAccount
        ? description ||
          t('transactionMessage.transfer', {
            amount,
            asset: asset.symbol,
            address: dest,
          })
        : undefined,
    });
  }, [account, signer, destination, amount, description, destinationChain]);

  const validateBalance = (amount: string): boolean => {
    if (!accountBalance) return false;
    const amountBN = new BN(formatAmount(amount, asset.precision));
    const xcmFeeBN = new BN(xcmFee || 0);

    return amountBN.add(xcmFeeBN).lte(new BN(accountBalance));
  };

  const validateBalanceForFee = (amount: string): boolean => {
    const balance = isMultisigAccount ? signerBalance : accountBalance;
    const nativeTokenBalance = isMultisigAccount ? signerNativeTokenBalance : accountNativeTokenBalance;

    const amountBN = new BN(formatAmount(amount, asset.precision));
    const xcmFeeBN = new BN(xcmFee || 0);

    if (!balance) return false;

    if (nativeTokenBalance) {
      return new BN(fee).lte(new BN(nativeTokenBalance));
    }

    if (isMultisigAccount) {
      return new BN(fee).lte(new BN(balance));
    }

    return new BN(fee).add(amountBN).add(xcmFeeBN).lte(new BN(balance));
  };

  const validateBalanceForFeeAndDeposit = (): boolean => {
    if (!isMultisigAccount) return true;
    if (!signerBalance) return false;

    const feeBN = new BN(fee);

    if (signerNativeTokenBalance) {
      return new BN(deposit).add(feeBN).lte(new BN(signerNativeTokenBalance));
    }

    return new BN(deposit).add(feeBN).lte(new BN(signerBalance));
  };

  const submitTransaction: SubmitHandler<TransferFormData> = async ({ description }) => {
    if (!amount || !destination || !account) return;

    if (!isMultisigAccount) {
      onSubmit();

      return;
    }

    const multisigTxs = await getMultisigTxs({
      chainId: chain.chainId,
      callHash: getCallHash(),
      status: MultisigTxInitStatus.SIGNING,
    });

    if (multisigTxs.length !== 0) {
      setMultisigTxExist(true);
    } else {
      onSubmit();
    }
  };

  const handleMyselfClick = () => {
    if (destinationChainAccounts.length > 1) {
      setSelectAccountModalOpen(true);
    } else if (destinationChainAccounts.length === 1) {
      handleAccountSelect(destinationChainAccounts[0]);
    }
  };

  const handleAccountSelect = (account: Account) => {
    setSelectAccountModalOpen(false);

    if (!account) return;

    const prefix =
      destinations.find((c) => c.chainId === destinationChain?.value)?.addressPrefix || SS58_DEFAULT_PREFIX;
    const address = accountUtils.isEthereumBased(account)
      ? account.accountId
      : toAddress(account.accountId, { prefix });

    setValue('destination', address, { shouldValidate: true });
  };

  return (
    <form className="w-full" onSubmit={handleSubmit(submitTransaction)}>
      <div className="flex flex-col gap-y-4">
        {header}

        {Boolean(destinations?.length) && (
          <Controller
            name="destinationChain"
            control={control}
            render={({ field: { onChange, value }, fieldState: { error } }) => (
              <Select
                label={t('transfer.destinationChainLabel')}
                placeholder={t('transfer.destinationChainPlaceholder')}
                invalid={Boolean(error)}
                selectedId={value?.id}
                options={destinationOptions}
                onChange={onChange}
              />
            )}
          />
        )}

        <Controller
          name="destination"
          control={control}
          rules={{ required: true, validate: validateAddress }}
          render={({ field: { onChange, value }, fieldState: { error } }) => (
            <div className="flex flex-col gap-y-2">
              <Input
                prefixElement={
                  <div className="flex h-auto items-center">
                    {value && !error ? (
                      <Identicon className="mr-2" size={20} address={value} background={false} />
                    ) : (
                      <Icon className="mr-2" size={20} name="emptyIdenticon" />
                    )}
                  </div>
                }
                suffixElement={
                  isXcmTransfer &&
                  !destination &&
                  Boolean(destinationChainAccounts.length) && (
                    <Button size="sm" pallet="secondary" onClick={handleMyselfClick}>
                      {t('transfer.myselfButton')}
                    </Button>
                  )
                }
                wrapperClass="w-full h-10.5"
                invalid={Boolean(error)}
                value={value}
                label={t('transfer.recipientLabel')}
                placeholder={t('transfer.recipientPlaceholder')}
                onChange={onChange}
              />
              <InputHint active={error?.type === 'validate'} variant="error">
                {t('transfer.incorrectRecipientError')}
              </InputHint>
              <InputHint active={error?.type === 'required'} variant="error">
                {t('transfer.requiredRecipientError')}
              </InputHint>
            </div>
          )}
        />

        <Controller
          name="amount"
          control={control}
          rules={{
            required: true,
            validate: {
              notZero: (v) => Number(v) > 0,
              insufficientBalance: validateBalance,
              insufficientBalanceForFee: validateBalanceForFee,
              insufficientBalanceForDeposit: validateBalanceForFeeAndDeposit,
            },
          }}
          render={({ field: { onChange, value }, fieldState: { error } }) => (
            <div className="flex flex-col gap-y-2">
              <AmountInput
                invalid={Boolean(error)}
                value={value}
                balance={accountBalance}
                balancePlaceholder={t('general.input.availableLabel')}
                placeholder={t('general.input.amountLabel')}
                asset={asset}
                onChange={onChange}
              />
              <InputHint active={error?.type === 'insufficientBalance'} variant="error">
                {t('transfer.notEnoughBalanceError')}
              </InputHint>
              <InputHint active={error?.type === 'insufficientBalanceForFee'} variant="error">
                {t('transfer.notEnoughBalanceForFeeError')}
              </InputHint>
              <InputHint active={error?.type === 'insufficientBalanceForDeposit'} variant="error">
                {t('transfer.notEnoughBalanceForDepositError')}
              </InputHint>
              <InputHint active={error?.type === 'required'} variant="error">
                {t('transfer.requiredAmountError')}
              </InputHint>
              <InputHint active={error?.type === 'notZero'} variant="error">
                {t('transfer.requiredAmountError')}
              </InputHint>
            </div>
          )}
        />

        {isMultisigAccount && (
          <Controller
            name="description"
            control={control}
            rules={{ maxLength: DESCRIPTION_MAX_LENGTH }}
            render={({ field: { onChange, value }, fieldState: { error } }) => (
              <div className="flex flex-col gap-y-2">
                <Input
                  spellCheck
                  className="w-full"
                  label={t('general.input.descriptionLabel')}
                  placeholder={t('general.input.descriptionPlaceholder')}
                  invalid={Boolean(error)}
                  value={value}
                  onChange={onChange}
                />
                <InputHint active={error?.type === 'maxLength'} variant="error">
                  <Trans
                    t={t}
                    i18nKey="transfer.descriptionLengthError"
                    values={{ maxLength: DESCRIPTION_MAX_LENGTH }}
                  />
                </InputHint>
              </div>
            )}
          />
        )}

        {footer}
      </div>

      <InputHint className="mt-2" active={multisigTxExist} variant="error">
        {t('transfer.multisigTransactionExist')}
      </InputHint>

      <Button
        className="w-fit flex-0 mt-7 ml-auto"
        type="submit"
        disabled={feeIsLoading || !isValid || (isXcmTransfer && !isXcmValid)}
      >
        {t('transfer.continueButton')}
      </Button>

      {accounts && (
        <AccountSelectModal
          isOpen={isSelectAccountModalOpen}
          accounts={destinationChainAccounts}
          chain={chain}
          onClose={() => setSelectAccountModalOpen(false)}
          onSelect={handleAccountSelect}
        />
      )}
    </form>
  );
};
