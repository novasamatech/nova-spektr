import { ApiPromise } from '@polkadot/api';
import { useEffect, useState } from 'react';

import { useI18n } from '@renderer/app/providers';
import { DropdownOption, DropdownResult } from '@renderer/shared/ui/Dropdowns/common/types';
import { ChainId, SigningType } from '@renderer/domain/shared-kernel';
import { useAccount } from '@renderer/services/account/accountService';
import { Explorer } from '@renderer/domain/chain';
import { Asset } from '@renderer/domain/asset';
import { Transaction } from '@renderer/domain/transaction';
import { TransferForm } from '../TransferForm';
import { Account, isMultisig, MultisigAccount } from '@renderer/domain/account';
import { getAccountOption, getSignatoryOption } from '../../common/utils';
import { InputHint, Select } from '@renderer/shared/ui';
import { useBalance } from '@renderer/services/balance/balanceService';

type Props = {
  api: ApiPromise;
  chainId: ChainId;
  network: string;
  asset?: Asset;
  nativeToken: Asset;
  explorers?: Explorer[];
  addressPrefix: number;
  onAccountChange: (account: Account | MultisigAccount) => void;
  onSignatoryChange: (account: Account) => void;
  onResult: (transferTx: Transaction, multisig?: { multisigTx: Transaction; description: string }) => void;
};

const InitOperation = ({
  api,
  chainId,
  network,
  asset,
  nativeToken,
  addressPrefix,
  onResult,
  onAccountChange,
  onSignatoryChange,
}: Props) => {
  const { t } = useI18n();
  const { getLiveAccounts, getActiveAccounts } = useAccount();
  const { getLiveAssetBalances } = useBalance();

  const accounts = getActiveAccounts();
  const dbAccounts = getLiveAccounts();

  const [fee, setFee] = useState<string>('0');
  const [amount, setAmount] = useState<string>('0');
  const [deposit, setDeposit] = useState<string>('0');

  const [activeAccount, setActiveAccount] = useState<DropdownResult<Account | MultisigAccount>>();
  const [accountsOptions, setAccountsOptions] = useState<DropdownOption<Account | MultisigAccount>[]>([]);

  const [activeSignatory, setActiveSignatory] = useState<DropdownResult<Account>>();
  const [signatoryOptions, setSignatoryOptions] = useState<DropdownOption<MultisigAccount>[]>([]);

  const accountIds = accounts.map((account) => account.accountId);
  const balances = getLiveAssetBalances(accountIds, chainId, asset?.assetId.toString() || '');
  const nativeBalances = getLiveAssetBalances(accountIds, chainId, nativeToken?.assetId.toString() || '');

  const accountIsMultisig = activeAccount && isMultisig(activeAccount.value);
  const signatoryIds = accountIsMultisig
    ? (activeAccount.value as MultisigAccount).signatories.map((s) => s.accountId)
    : [];
  const signatoriesBalances = getLiveAssetBalances(
    signatoryIds,
    chainId,
    nativeToken?.assetId.toString() || asset?.assetId.toString() || '',
  );

  useEffect(() => {
    if (!asset) return;

    const options = accounts.reduce<any[]>((acc, account) => {
      const balance = balances.find((b) => b.accountId === account.accountId);
      const nativeBalance = nativeBalances.find((b) => b.accountId === account.accountId);

      const isSameChain = !account.chainId || account.chainId === chainId;

      if (isSameChain) {
        acc.push(getAccountOption(account, { addressPrefix, asset, amount, balance, nativeBalance, fee, deposit }));
      }

      return acc;
    }, []);

    if (options.length === 0) return;

    setAccountsOptions(options);

    if (!activeAccount) {
      setActiveAccount({ id: options[0].id, value: options[0].value });
      onAccountChange(options[0].value);
    }
  }, [accounts.length, balances, amount, fee, deposit]);

  useEffect(() => {
    if (!activeAccount || !isMultisig(activeAccount.value) || !asset) {
      setActiveSignatory(undefined);
      setSignatoryOptions([]);
    } else {
      const signatories = activeAccount.value.signatories.map((s) => s.accountId);

      const signers = dbAccounts.filter(
        (a) => a.signingType !== SigningType.WATCH_ONLY && signatories.includes(a.accountId),
      ) as MultisigAccount[];

      const options = signers.reduce<any[]>((acc, signer) => {
        if (signatoryIds.includes(signer.accountId)) {
          const balance = signatoriesBalances.find((b) => b.accountId === signer.accountId);

          acc.push(getSignatoryOption(signer, { addressPrefix, asset: nativeToken || asset, balance, fee, deposit }));
        }

        return acc;
      }, []);

      if (options.length === 0) return;

      setSignatoryOptions(options);

      if (!activeSignatory) {
        onSignatoryChange(options[0].value);
        setActiveSignatory({ id: options[0].id, value: options[0].value });
      }
    }
  }, [activeAccount, signatoriesBalances, dbAccounts.length, fee, deposit]);

  const changeAccount = (account: DropdownResult<Account | MultisigAccount>) => {
    onAccountChange(account.value);
    setActiveAccount(account);
  };

  const changeSignatory = (account: DropdownResult<Account | MultisigAccount>) => {
    onSignatoryChange(account.value);
    setActiveSignatory(account);
  };

  return (
    <div className="flex flex-col gap-y-4">
      {accountsOptions.length > 1 && (
        <Select
          label={t('transfer.senderLabel')}
          placeholder={t('receive.selectWalletPlaceholder')}
          selectedId={activeAccount?.id}
          disabled={accountsOptions.length === 1}
          options={accountsOptions}
          onChange={changeAccount}
        />
      )}

      {isMultisig(activeAccount?.value) && (
        <>
          <Select
            label={t('transfer.signatoryLabel')}
            placeholder={t('receive.selectWalletPlaceholder')}
            selectedId={activeSignatory?.id}
            disabled={!signatoryOptions.length}
            options={signatoryOptions}
            onChange={changeSignatory}
          />
          <InputHint active={!signatoryOptions.length}>{t('multisigOperations.noSignatory')}</InputHint>
        </>
      )}

      {asset && (
        <TransferForm
          api={api}
          chainId={chainId}
          network={network}
          account={activeAccount?.value}
          signer={activeSignatory?.value}
          asset={asset}
          nativeToken={nativeToken}
          addressPrefix={addressPrefix}
          onSubmit={onResult}
          onChangeAmount={setAmount}
          onChangeFee={setFee}
          onChangeDeposit={setDeposit}
        />
      )}
    </div>
  );
};

export default InitOperation;
