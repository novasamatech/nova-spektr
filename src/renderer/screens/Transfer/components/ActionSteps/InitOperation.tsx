import { ApiPromise } from '@polkadot/api';
import { useState, useEffect } from 'react';

import { useI18n } from '@renderer/context/I18nContext';
import { DropdownOption, DropdownResult } from '@renderer/components/ui/Dropdowns/common/types';
import { ChainId } from '@renderer/domain/shared-kernel';
import { useAccount } from '@renderer/services/account/accountService';
import { Explorer } from '@renderer/domain/chain';
import { Asset } from '@renderer/domain/asset';
import { Transaction } from '@renderer/domain/transaction';
import { TransferForm } from '../TransferForm';
import { Account, MultisigAccount, isMultisig } from '@renderer/domain/account';
import { getAccountsOptions } from '../../common/utils';
import { Select } from '@renderer/components/ui-redesign';

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

  const accounts = getActiveAccounts();
  const dbAccounts = getLiveAccounts();

  const [activeAccount, setActiveAccount] = useState<DropdownResult<Account | MultisigAccount>>();
  const [accountsOptions, setAccountsOptions] = useState<DropdownOption<Account | MultisigAccount>[]>([]);
  const [activeSignatory, setActiveSignatory] = useState<DropdownResult<Account>>();
  const [signatoryOptions, setSignatoryOptions] = useState<DropdownOption<MultisigAccount>[]>([]);

  useEffect(() => {
    const options = getAccountsOptions(chainId, accounts, addressPrefix);

    if (options.length === 0) return;

    setAccountsOptions(options);
    setActiveAccount({ id: options[0].id, value: options[0].value });
    onAccountChange(options[0].value);
  }, [accounts.length]);

  useEffect(() => {
    if (!activeAccount || !isMultisig(activeAccount.value)) {
      setActiveSignatory(undefined);
      setSignatoryOptions([]);
    } else {
      const signatories = activeAccount.value.signatories.map((s) => s.accountId);
      const signers = dbAccounts.filter((a) => signatories.includes(a.accountId)) as MultisigAccount[];

      const options = getAccountsOptions<MultisigAccount>(chainId, signers, addressPrefix);

      if (options.length === 0) return;

      setSignatoryOptions(options);
      onSignatoryChange(options[0].value);
      setActiveSignatory({ id: options[0].id, value: options[0].value });
    }
  }, [activeAccount, dbAccounts.length]);

  const changeAccount = (account: DropdownResult<Account | MultisigAccount>) => {
    onAccountChange(account.value);
    setActiveAccount(account);
  };

  const changeSignatory = (account: DropdownResult<Account | MultisigAccount>) => {
    onSignatoryChange(account.value);
    setActiveSignatory(account);
  };

  return (
    <div className="flex flex-col gap-y-2">
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

      {signatoryOptions.length > 1 && (
        <Select
          label={t('transfer.signatoryLabel')}
          placeholder={t('receive.selectWalletPlaceholder')}
          selectedId={activeSignatory?.id}
          options={signatoryOptions}
          onChange={changeSignatory}
        />
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
        />
      )}
    </div>
  );
};

export default InitOperation;
