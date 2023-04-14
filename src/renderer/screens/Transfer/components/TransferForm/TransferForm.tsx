import { BN } from '@polkadot/util';
import { useEffect, useState } from 'react';
import { Controller, useForm, SubmitHandler } from 'react-hook-form';
import { Trans } from 'react-i18next';
import { ApiPromise } from '@polkadot/api';

import { pasteAddressHandler, toPublicKey, isAddressValid, formatAddress } from '@renderer/shared/utils/address';
import { Button, AmountInput, Icon, Identicon, Input, InputHint, Block, InputArea } from '@renderer/components/ui';
import { Fee, Deposit } from '@renderer/components/common';
import { useI18n } from '@renderer/context/I18nContext';
import { Asset, AssetType } from '@renderer/domain/asset';
import { Transaction, MultisigTxInitStatus, TransactionType } from '@renderer/domain/transaction';
import { useBalance } from '@renderer/services/balance/balanceService';
import { formatAmount, transferableAmount } from '@renderer/services/balance/common/utils';
import { AccountID, ChainId } from '@renderer/domain/shared-kernel';
import { useTransaction } from '@renderer/services/transaction/transactionService';
import { useMultisigTx } from '@renderer/services/multisigTx/multisigTxService';
import { getAssetId } from '@renderer/shared/utils/assets';
import { MultisigAccount, Account, isMultisig } from '@renderer/domain/account';

type TransferFormData = {
  amount: string;
  signatory: AccountID;
  destination: AccountID;
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
  onSubmit: (transferTx: Transaction, multisig?: { multisigTx: Transaction; description: string }) => void;
};

export const TransferForm = ({
  api,
  chainId,
  network,
  account,
  signer,
  asset,
  nativeToken,
  addressPrefix,
  onSubmit,
}: Props) => {
  const { t } = useI18n();
  const { getBalance } = useBalance();
  const { getMultisigTxs } = useMultisigTx();
  const { getTransactionHash } = useTransaction();

  const [fee, setFee] = useState('');
  const [deposit, setDeposit] = useState('');

  const [accountBalance, setAccountBalance] = useState('');
  const [signerBalance, setSignerBalance] = useState('');
  const [accountNativeTokenBalance, setAccountNativeTokenBalance] = useState<string>();
  const [signerNativeTokenBalance, setSignerNativeTokenBalance] = useState<string>();

  const [transferTx, setTransferTx] = useState<Transaction>();
  const [multisigTx, setMultisigTx] = useState<Transaction>();
  const [multisigTxExist, setMultisigTxExist] = useState(false);

  const {
    handleSubmit,
    control,
    watch,
    trigger,
    resetField,
    formState: { isValid },
  } = useForm<TransferFormData>({
    mode: 'onChange',
    defaultValues: { amount: '', destination: '', signatory: '', description: '' },
  });

  const amount = watch('amount');
  const destination = watch('destination');

  const setupBalances = (
    accountId: AccountID,
    callbackNativeToken: (balance: string) => void,
    callbackBalance: (balance: string) => void,
  ) => {
    const publicKey = toPublicKey(accountId) || '0x0';

    getBalance(publicKey, chainId, asset.assetId.toString()).then((balance) => {
      callbackBalance(balance ? transferableAmount(balance) : '0');
    });

    if (asset.assetId !== 0) {
      getBalance(publicKey, chainId, '0').then((balance) => {
        callbackNativeToken(balance ? transferableAmount(balance) : '0');
      });
    }
  };

  useEffect(() => {
    if (!account?.accountId) return;

    setupBalances(account.accountId, setAccountNativeTokenBalance, setAccountBalance);
  }, [account]);

  useEffect(() => {
    if (!signer?.accountId) return;

    setupBalances(signer.accountId, setSignerNativeTokenBalance, setSignerBalance);
  }, [signer]);

  useEffect(() => {
    if (!isMultisig(account)) {
      setMultisigTx(undefined);
      setDeposit('0');
    }
  }, [account]);

  useEffect(() => {
    if (!account?.accountId || !amount || !isAddressValid(destination)) return;

    const transferPayload = getTransferTx(account.accountId);

    if (isMultisig(account) && signer?.accountId) {
      setMultisigTx(getMultisigTx(account, signer.accountId, transferPayload));
    }

    setTransferTx(transferPayload);
  }, [account, destination, amount]);

  const getTransferTx = (address: AccountID): Transaction => {
    const TransferType: Record<AssetType, TransactionType> = {
      [AssetType.ORML]: TransactionType.ORML_TRANSFER,
      [AssetType.STATEMINE]: TransactionType.ASSET_TRANSFER,
    };

    return {
      chainId,
      address,
      type: asset.type ? TransferType[asset.type] : TransactionType.TRANSFER,
      args: {
        dest: formatAddress(destination, addressPrefix),
        value: formatAmount(amount, asset.precision),
        asset: getAssetId(asset),
      },
    };
  };

  const getMultisigTx = (account: MultisigAccount, signer: AccountID, transaction: Transaction): Transaction => {
    const { callData, callHash } = getTransactionHash(transaction, api);

    const otherSignatories = account.signatories
      .reduce<AccountID[]>((acc, s) => {
        const signerAddress = formatAddress(signer, addressPrefix);
        const signatoryAddress = formatAddress(s.accountId, addressPrefix);
        if (signerAddress !== signatoryAddress) {
          acc.push(signatoryAddress);
        }

        return acc;
      }, [])
      .sort();

    return {
      chainId,
      address: signer,
      type: TransactionType.MULTISIG_AS_MULTI,
      args: {
        threshold: account.threshold,
        otherSignatories,
        maybeTimepoint: null,
        callData,
        callHash,
      },
    };
  };

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

    return new BN(fee).add(new BN(formatAmount(amount, asset.precision))).lte(new BN(balance));
  };

  const validateBalanceForFeeAndDeposit = (amount: string): boolean => {
    if (!isMultisig(account)) return true;
    if (!signerBalance) return false;

    if (signerNativeTokenBalance) {
      return new BN(deposit).add(new BN(fee)).lte(new BN(signerNativeTokenBalance));
    }

    return new BN(deposit)
      .add(new BN(fee))
      .add(new BN(formatAmount(amount, asset.precision)))
      .lte(new BN(signerBalance));
  };

  const updateFee = async (fee: string) => {
    setFee(fee);

    if (fee !== '0') {
      await trigger('amount');
    }
  };

  const submitTransaction: SubmitHandler<TransferFormData> = async ({ description }) => {
    if (!transferTx) return;

    if (!multisigTx) {
      onSubmit(transferTx);

      return;
    }

    const { callHash } = getTransactionHash(transferTx, api);
    const multisigTxs = await getMultisigTxs({ chainId, callHash, status: MultisigTxInitStatus.SIGNING });

    if (multisigTxs.length !== 0) {
      setMultisigTxExist(true);
    } else {
      onSubmit(transferTx, { multisigTx, description });
    }
  };

  return (
    <form className="w-full" onSubmit={handleSubmit(submitTransaction)}>
      <Block className="flex flex-col gap-y-5 p-5 mb-2.5">
        <p className="text-neutral text-base">
          <Trans t={t} i18nKey="transfer.formTitle" values={{ asset: asset.symbol, network }} />
        </p>
        <Controller
          name="destination"
          control={control}
          rules={{ required: true, validate: isAddressValid }}
          render={({ field: { onChange, value }, fieldState: { error } }) => (
            <div className="flex flex-col gap-y-2.5">
              <Input
                prefixElement={
                  value && !error ? <Identicon address={value} background={false} /> : <Icon name="emptyIdenticon" />
                }
                suffixElement={
                  value ? (
                    <button
                      className="text-neutral"
                      type="button"
                      onClick={() => resetField('destination', { defaultValue: '' })}
                    >
                      <Icon name="clearOutline" />
                    </button>
                  ) : (
                    <Button variant="outline" pallet="primary" onClick={pasteAddressHandler(onChange)}>
                      {t('general.button.pasteButton')}
                    </Button>
                  )
                }
                className="w-full"
                invalid={Boolean(error)}
                value={value}
                label={t('transfer.recipientLabel')}
                placeholder={t('transfer.recipientLabel')}
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
            <div className="flex flex-col gap-y-2.5">
              <AmountInput
                value={value}
                placeholder={t('transfer.amountPlaceholder')}
                asset={asset}
                balance={accountBalance}
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

        <div className="grid grid-flow-row grid-cols-2 items-center gap-y-5">
          <p className="uppercase text-neutral-variant text-2xs">{t('transfer.networkFee')}</p>
          <Fee
            className="text-neutral justify-self-end text-2xs font-semibold"
            api={api}
            asset={nativeToken}
            transaction={transferTx}
            onFeeChange={updateFee}
          />
          {isMultisig(account) && (
            <>
              <p className="uppercase text-neutral-variant text-2xs">{t('transfer.networkDeposit')}</p>
              <Deposit
                className="text-neutral justify-self-end text-2xs font-semibold"
                api={api}
                asset={nativeToken}
                threshold={account.threshold}
                onDepositChange={setDeposit}
              />
            </>
          )}
        </div>
      </Block>

      {isMultisig(account) && (
        <Block>
          <Controller
            name="description"
            control={control}
            rules={{ required: true, maxLength: 120 }}
            render={({ field: { onChange, value }, fieldState: { error } }) => (
              <div className="flex flex-col gap-y-2.5">
                <InputArea
                  className="w-full"
                  label={t('transfer.descriptionLabel')}
                  placeholder={t('transfer.descriptionPlaceholder')}
                  invalid={Boolean(error)}
                  rows={2}
                  value={value}
                  onChange={onChange}
                />
                <InputHint active={error?.type === 'required'} variant="error">
                  {t('transfer.requiredDescriptionError')}
                </InputHint>
                <InputHint active={error?.type === 'maxLength'} variant="error">
                  <Trans t={t} i18nKey="transfer.descriptionLengthError" values={{ maxLength: 120 }} />
                </InputHint>
              </div>
            )}
          />
          <InputHint className="mt-2.5" active={multisigTxExist} variant="error">
            {t('transfer.multisigTransactionExist')}
          </InputHint>
        </Block>
      )}

      <Button
        variant="fill"
        pallet="primary"
        weight="lg"
        className="w-fit flex-0 m-auto mt-5"
        type="submit"
        disabled={!isValid}
      >
        {t('transfer.continueButton')}
      </Button>
    </form>
  );
};
