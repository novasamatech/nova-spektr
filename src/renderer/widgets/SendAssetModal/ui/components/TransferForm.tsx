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
  SS58_DEFAULT_PREFIX,
  formatAmount,
  getAssetId,
  toAccountId,
  toAddress,
  transferableAmount,
  validateAddress,
} from '@renderer/shared/lib/utils';
import { Chain } from '@renderer/entities/chain';
import { getChainOption, getPlaceholder } from '../common/utils';
import { DropdownOption, DropdownResult } from '@renderer/shared/ui/types';
import { XcmTransfer, XcmTransferType } from '@renderer/shared/api/xcm';
import AccountSelectModal from '@renderer/pages/Operations/components/modals/AccountSelectModal/AccountSelectModal';

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
  xcmParams: {
    dest?: Object;
    beneficiary?: Object;
    asset?: Object;
    transfer?: XcmTransfer;
    fee: string;
    weight: string;
  };
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
  accounts,
  chain,
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
  xcmParams,
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
  const [destinationOptions, setDestinationOptions] = useState<DropdownOption<ChainId | string>[]>([]);
  const [isSelectAccountModalOpen, setSelectAccountModalOpen] = useState(false);

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
  const destinationChain = watch('destinationChain');
  const destinationChainAccounts = accounts?.filter((a) => !a.rootId || a.chainId === destinationChain?.value) || [];

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

  const isXcmTransfer = destinationChain?.value !== chainId && !!xcmParams.transfer;
  const isXcmValid = xcmParams.fee && xcmParams.asset && xcmParams.beneficiary && xcmParams.dest;

  useEffect(() => {
    if (!account || !amount || !validateAddress(destination)) return;

    const transferPayload = getTransferTx(account.accountId);

    if (isMultisig(account) && signer && (!isXcmTransfer || isXcmValid)) {
      const multisigTx = getMultisigTx(account, signer.accountId, transferPayload);

      setMultisigTx(multisigTx);
    }

    setTransferTx(transferPayload);
    onTxChange(transferPayload);
  }, [
    account,
    signer,
    destination,
    amount,
    destinationChain,
    isXcmValid,
    isXcmTransfer,
    xcmParams.fee,
    xcmParams.asset,
    xcmParams.beneficiary,
    xcmParams.dest,
  ]);

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

    const isNativeTransfer = !asset.type;

    let transactionType;
    let args: any = {
      dest: toAddress(destination, { prefix: addressPrefix }),
      value: formatAmount(amount, asset.precision),
      ...(!isNativeTransfer && { asset: getAssetId(asset) }),
    };

    if (isXcmTransfer && xcmParams.transfer) {
      transactionType = getXcmTransferType(xcmParams.transfer.type);

      args = {
        ...args,
        destinationChain: destinationChain?.value,
        xcmFee: xcmParams.fee,
        xcmAsset: xcmParams.asset,
        xcmDest: xcmParams.dest,
        xcmBeneficiary: xcmParams.beneficiary,
        xcmWeight: xcmParams.weight,
      };
    } else {
      transactionType = isNativeTransfer ? TransactionType.TRANSFER : TransferType[asset.type!];
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
    const amountBN = new BN(formatAmount(amount, asset.precision));
    const xcmFeeBN = new BN(xcmParams.fee || 0);

    return amountBN.add(xcmFeeBN).lte(new BN(accountBalance));
  };

  const validateBalanceForFee = (amount: string): boolean => {
    const balance = isMultisig(account) ? signerBalance : accountBalance;
    const nativeTokenBalance = isMultisig(account) ? signerNativeTokenBalance : accountNativeTokenBalance;

    const amountBN = new BN(formatAmount(amount, asset.precision));
    const xcmFeeBN = new BN(xcmParams.fee || 0);

    if (!balance) return false;

    if (nativeTokenBalance) {
      return new BN(fee).lte(new BN(nativeTokenBalance));
    }

    if (isMultisig(account)) {
      return new BN(fee).lte(new BN(balance));
    }

    return new BN(fee).add(amountBN).add(xcmFeeBN).lte(new BN(balance));
  };

  const validateBalanceForFeeAndDeposit = (): boolean => {
    if (!isMultisig(account)) return true;
    if (!signerBalance) return false;

    const feeBN = new BN(fee);

    if (signerNativeTokenBalance) {
      return new BN(deposit).add(feeBN).lte(new BN(signerNativeTokenBalance));
    }

    return new BN(deposit).add(feeBN).lte(new BN(signerBalance));
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

  const handleMyselfClick = () => {
    if (destinationChainAccounts.length > 1) {
      setSelectAccountModalOpen(true);
    } else if (account) {
      handleAccountSelect(account);
    }
  };

  const handleAccountSelect = (account: Account) => {
    setSelectAccountModalOpen(false);

    if (!account) return;

    const prefix =
      destinations.find((c) => c.chainId === destinationChain?.value)?.addressPrefix || SS58_DEFAULT_PREFIX;
    const address = toAddress(account.accountId, { prefix });

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
                  !destination && (
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
                currencyId="usd"
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
