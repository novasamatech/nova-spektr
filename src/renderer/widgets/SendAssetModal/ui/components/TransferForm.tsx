import { BN } from '@polkadot/util';
import { ReactNode, useEffect, useState } from 'react';
import { Controller, SubmitHandler, useForm } from 'react-hook-form';
import { ApiPromise } from '@polkadot/api';
import { Trans } from 'react-i18next';

import { AmountInput, Button, Icon, Identicon, Input, InputHint, Select } from '@renderer/shared/ui';
import { useI18n } from '@renderer/app/providers';
import { Asset, AssetType, useBalance } from '@renderer/entities/asset';
import { MultisigTxInitStatus, Transaction, TransactionType, useTransaction } from '@renderer/entities/transaction';
import { AccountId, Address, ChainId } from '@renderer/domain/shared-kernel';
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
import { Chain } from '@renderer/entities/chain';
import { getChainOption } from '../common/utils';
import { DropdownOption, DropdownResult } from '@renderer/shared/ui/types';
import { XcmTransfer, XcmTransferType } from '@renderer/shared/api/xcm';

const DESCRIPTION_MAX_LENGTH = 120;

type TransferFormData = {
  amount: string;
  signatory: Address;
  destination: Address;
  description: string;
  destinationChain?: DropdownResult<ChainId>;
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
  xcmDest?: Object;
  xcmBeneficiary?: Object;
  xcmAsset?: Object;
  xcmTransfer?: XcmTransfer;
  xcmFee: string;
  xcmWeight: string;
  deposit: string;
  footer: ReactNode;
  header?: ReactNode;
  destinations: Chain[];
  onSubmit: (transferTx: Transaction, multisig?: { multisigTx: Transaction; description: string }) => void;
  onChangeAmount: (amount: string) => void;
  onDestinationChainChange: (destinationChain: ChainId) => void;
  onDestinationChange: (accountId: AccountId) => void;
  onTxChange: (tx: Transaction) => void;
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
  onChangeAmount,
  onTxChange,
  onDestinationChainChange,
  onDestinationChange,
  feeIsLoading,
  fee,
  deposit,
  destinations,
  xcmFee,
  xcmAsset,
  xcmBeneficiary,
  xcmDest,
  xcmTransfer,
  xcmWeight,
}: Props) => {
  const { t } = useI18n();
  const { getBalance } = useBalance();
  const { getMultisigTxs } = useMultisigTx({});
  const { getTransactionHash } = useTransaction();

  const [accountBalance, setAccountBalance] = useState('');
  const [signerBalance, setSignerBalance] = useState('');
  const [accountNativeTokenBalance, setAccountNativeTokenBalance] = useState<string>();
  const [signerNativeTokenBalance, setSignerNativeTokenBalance] = useState<string>();

  const [transferTx, setTransferTx] = useState<Transaction>();
  const [multisigTx, setMultisigTx] = useState<Transaction>();
  const [multisigTxExist, setMultisigTxExist] = useState(false);
  const [destinationOptions, setDestinationOptions] = useState<DropdownOption<ChainId>[]>([]);

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
      setDestinationOptions(destinationOptions);
    }

    setValue('destinationChain', destinationOptions[0]);
  }, [destinations.length]);

  const amount = watch('amount');
  const destination = watch('destination');
  const destinationChain = watch('destinationChain');

  useEffect(() => {
    if (destinationChain) {
      onDestinationChainChange(destinationChain.value);
    }
  }, [destinationChain]);

  useEffect(() => {
    isDirty && trigger('amount');
  }, [accountBalance, signerBalance]);

  useEffect(() => {
    onChangeAmount(formatAmount(amount, asset.precision));
  }, [amount]);

  useEffect(() => {
    onDestinationChange(toAccountId(destination));
  }, [destination]);

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
    if (!isMultisig(account)) {
      setMultisigTx(undefined);
    }
  }, [account]);

  useEffect(() => {
    if (fee !== '0') {
      trigger('amount').then();
    }
  }, [fee]);

  const isXcmTransfer = destinationChain?.value !== chainId && xcmTransfer;
  const isXcmValid = xcmAsset && xcmBeneficiary && xcmDest;

  useEffect(() => {
    if (!account || !amount || !validateAddress(destination)) return;

    const transferPayload = getTransferTx(account.accountId);

    if (isMultisig(account) && signer && (!isXcmTransfer || (xcmFee && xcmAsset && xcmDest))) {
      const multisigTx = getMultisigTx(account, signer.accountId, transferPayload);

      setMultisigTx(multisigTx);
    }

    setTransferTx(transferPayload);
    onTxChange(transferPayload);
  }, [account, signer, destination, amount, destinationChain, xcmFee, xcmAsset, xcmDest, isXcmTransfer]);

  const getXcmTransferType = (type: XcmTransferType): TransactionType => {
    if (type === 'xtokens') {
      return TransactionType.XTOKENS_TRANSFER_MULTIASSET;
    }

    if (type === 'xcmpallet-teleport') {
      return api.tx.xcmPallet ? TransactionType.XCM_TELEPORT : TransactionType.POLKADOT_XCM_TELEPORT;
    }

    return api.tx.xcmPallet ? TransactionType.XCM_LIMITED_TRANSFER : TransactionType.POLKADOT_XCM_LIMITED_TRANSFER;
  };

  const getTransferTx = (accountId: AccountId): Transaction => {
    const TransferType: Record<AssetType, TransactionType> = {
      [AssetType.ORML]: TransactionType.ORML_TRANSFER,
      [AssetType.STATEMINE]: TransactionType.ASSET_TRANSFER,
    };

    let transactionType;
    let args;

    if (isXcmTransfer) {
      transactionType = getXcmTransferType(xcmTransfer.type);

      args = {
        destinationChain: destinationChain?.value,
        dest: toAddress(destination, { prefix: addressPrefix }),
        value: formatAmount(amount, asset.precision),
        xcmFee,
        xcmAsset,
        xcmDest,
        xcmBeneficiary,
        xcmWeight,
      };
    } else {
      transactionType = asset.type ? TransferType[asset.type] : TransactionType.TRANSFER;
      args = {
        dest: toAddress(destination, { prefix: addressPrefix }),
        value: formatAmount(amount, asset.precision),
        ...(transactionType !== TransactionType.TRANSFER && { asset: getAssetId(asset) }),
      };
    }

    return {
      chainId,
      address: toAddress(accountId, { prefix: addressPrefix }),
      type: transactionType,
      args,
    };
  };

  const getMultisigTx = (
    account: MultisigAccount,
    signerAccountId: AccountId,
    transaction: Transaction,
  ): Transaction => {
    const { callData, callHash } = getTransactionHash(transaction, api);

    const otherSignatories = account.signatories.reduce<Address[]>((acc, s) => {
      if (s.accountId !== signerAccountId) {
        acc.push(toAddress(s.accountId, { prefix: addressPrefix }));
      }

      return acc;
    }, []);

    return {
      chainId,
      address: toAddress(signerAccountId, { prefix: addressPrefix }),
      type: TransactionType.MULTISIG_AS_MULTI,
      args: {
        threshold: account.threshold,
        otherSignatories: otherSignatories.sort(),
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
    const amountBN = new BN(formatAmount(amount, asset.precision));

    if (!balance) return false;

    if (nativeTokenBalance) {
      return new BN(fee).lte(new BN(nativeTokenBalance));
    }

    if (isMultisig(account)) {
      return new BN(fee).add(amountBN).lte(new BN(balance));
    }

    return new BN(fee)
      .add(amountBN)
      .add(new BN(xcmFee || 0))
      .lte(new BN(balance));
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
      description =
        description ||
        t('transactionMessage.transfer', {
          amount,
          asset: asset.symbol,
          address: transferTx.args.dest,
        });

      onSubmit(transferTx, { multisigTx, description });
    }
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

      <Button
        className="w-fit flex-0 mt-7 ml-auto"
        type="submit"
        disabled={feeIsLoading || !isValid || (isXcmTransfer && !isXcmValid)}
      >
        {t('transfer.continueButton')}
      </Button>
    </form>
  );
};
