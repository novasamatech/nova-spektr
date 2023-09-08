import { BN } from '@polkadot/util';
import { ReactNode, useEffect, useState } from 'react';
import { Controller, SubmitHandler, useForm } from 'react-hook-form';
import { ApiPromise } from '@polkadot/api';
import { Trans } from 'react-i18next';

import { AmountInput, Button, Icon, Identicon, Input, InputHint } from '@renderer/shared/ui';
import { useI18n } from '@renderer/app/providers';
import { Asset, AssetType, useBalance } from '@renderer/entities/asset';
import { MultisigTxInitStatus, Transaction, TransactionType, useTransaction } from '@renderer/entities/transaction';
import { Address, ChainId } from '@renderer/domain/shared-kernel';
import { useMultisigTx } from '@renderer/entities/multisig';
import { Account, isMultisig, MultisigAccount } from '@renderer/entities/account';
import {
  formatAmount,
  getAssetId,
  toAccountId,
  toAddress,
  transferableAmount,
  validateAddress,
} from '@renderer/shared/lib/utils';

const DESCRIPTION_MAX_LENGTH = 120;

export type TransferFormData = {
  amount: string;
  signatory: Address;
  destination: Address;
  description: string;
};

type Props = {
  api: ApiPromise;
  chainId: ChainId;
  network: string;
  account?: Account | MultisigAccount;
  signer?: Account;
  asset: Asset;
  nativeToken: Asset;
  addressPrefix: number;
  fee: string;
  feeIsLoading: boolean;
  deposit: string;
  footer: ReactNode;
  header?: ReactNode;
  onSubmit: (tx: Transaction) => void;
  onTxChange: (formData: Partial<TransferFormData>) => void;
};

export const TransferForm = ({
  api,
  chainId,
  account,
  signer,
  asset,
  addressPrefix,
  header,
  footer,
  onSubmit,
  onTxChange,
  feeIsLoading,
  fee,
  deposit,
}: Props) => {
  const { t } = useI18n();
  const { getBalance } = useBalance();
  const { getMultisigTxs } = useMultisigTx({});
  const { getTransactionHash, buildTransaction } = useTransaction();

  const [accountBalance, setAccountBalance] = useState('');
  const [signerBalance, setSignerBalance] = useState('');
  const [accountNativeTokenBalance, setAccountNativeTokenBalance] = useState<string>();
  const [signerNativeTokenBalance, setSignerNativeTokenBalance] = useState<string>();

  const [multisigTxExist, setMultisigTxExist] = useState(false);

  const {
    handleSubmit,
    control,
    watch,
    trigger,
    formState: { isValid, isDirty },
  } = useForm<TransferFormData>({
    mode: 'onChange',
    defaultValues: { amount: '', destination: '', signatory: '', description: '' },
  });

  const amount = watch('amount');
  const destination = watch('destination');
  const description = watch('description');

  useEffect(() => {
    isDirty && trigger('amount');
  }, [accountBalance, signerBalance]);

  const setupBalances = (
    address: Address,
    callbackNativeToken: (balance: string) => void,
    callbackBalance: (balance: string) => void,
  ) => {
    const accountId = toAccountId(address);

    getBalance(accountId, chainId, asset.assetId.toString()).then((balance) => {
      callbackBalance(balance ? transferableAmount(balance) : '0');
    });

    if (asset.assetId !== 0) {
      getBalance(accountId, chainId, '0').then((balance) => {
        callbackNativeToken(balance ? transferableAmount(balance) : '0');
      });
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
      description:
        description ||
        t('transactionMessage.transfer', {
          amount,
          asset: asset.symbol,
          address: dest,
        }),
    });
  }, [account, signer, destination, amount]);

  const validateBalance = (amount: string): boolean => {
    if (!accountBalance) return false;

    return new BN(formatAmount(amount, asset.precision)).lte(new BN(accountBalance));
  };

  const validateBalanceForFee = (amount: string): boolean => {
    const balance = isMultisig(account) ? signerBalance : accountBalance;
    const nativeTokenBalance = isMultisig(account) ? signerNativeTokenBalance : accountNativeTokenBalance;

    if (!balance) return false;

    if (nativeTokenBalance) {
      return new BN(fee).lte(new BN(nativeTokenBalance));
    }

    if (isMultisig(account)) {
      return new BN(fee).lte(new BN(balance));
    }

    return new BN(fee).add(new BN(formatAmount(amount, asset.precision))).lte(new BN(balance));
  };

  const validateBalanceForFeeAndDeposit = (): boolean => {
    if (!isMultisig(account)) return true;
    if (!signerBalance) return false;

    if (signerNativeTokenBalance) {
      return new BN(deposit).add(new BN(fee)).lte(new BN(signerNativeTokenBalance));
    }

    return new BN(deposit).add(new BN(fee)).lte(new BN(signerBalance));
  };

  const submitTransaction: SubmitHandler<TransferFormData> = async ({ description }) => {
    if (!amount || !destination || !account) return;

    const TransferType: Record<AssetType, TransactionType> = {
      [AssetType.ORML]: TransactionType.ORML_TRANSFER,
      [AssetType.STATEMINE]: TransactionType.ASSET_TRANSFER,
    };

    const transactionType = asset.type ? TransferType[asset.type] : TransactionType.TRANSFER;

    const transferTx = buildTransaction(
      transactionType,
      toAddress(account.accountId, { prefix: addressPrefix }),
      chainId,
      {
        dest: toAddress(destination, { prefix: addressPrefix }),
        value: formatAmount(amount, asset.precision),
        ...(transactionType !== TransactionType.TRANSFER && { asset: getAssetId(asset) }),
      },
    );

    if (!isMultisig(account)) {
      onSubmit(transferTx);

      return;
    }

    const { callHash } = getTransactionHash(transferTx, api);
    const multisigTxs = await getMultisigTxs({ chainId, callHash, status: MultisigTxInitStatus.SIGNING });

    if (multisigTxs.length !== 0) {
      setMultisigTxExist(true);
    } else {
      onSubmit(transferTx);
    }
  };

  return (
    <form className="w-full" onSubmit={handleSubmit(submitTransaction)}>
      <div className="flex flex-col gap-y-4">
        {header}
        <Controller
          name="destination"
          control={control}
          rules={{ required: true, validate: validateAddress }}
          render={({ field: { onChange, value }, fieldState: { error } }) => (
            <div className="flex flex-col gap-y-2">
              <Input
                prefixElement={
                  value && !error ? (
                    <Identicon className="mr-2" size={20} address={value} background={false} />
                  ) : (
                    <Icon className="mr-2" size={20} name="emptyIdenticon" />
                  )
                }
                className="w-full"
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

        {isMultisig(account) && (
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

      <Button className="w-fit flex-0 mt-7 ml-auto" type="submit" disabled={feeIsLoading || !isValid}>
        {t('transfer.continueButton')}
      </Button>
    </form>
  );
};
