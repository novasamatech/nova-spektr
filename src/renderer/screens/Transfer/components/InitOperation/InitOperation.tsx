import { ApiPromise } from '@polkadot/api';
import { useState, useEffect } from 'react';

import { Dropdown, Plate, Block } from '@renderer/components/ui';
import { useI18n } from '@renderer/context/I18nContext';
import { DropdownOption, DropdownResult } from '@renderer/components/ui/Dropdowns/common/types';
import { SigningType, ChainId } from '@renderer/domain/shared-kernel';
import { useAccount } from '@renderer/services/account/accountService';
import { Explorer } from '@renderer/domain/chain';
import { Asset } from '@renderer/domain/asset';
import { Transaction } from '@renderer/domain/transaction';
import { TransferForm } from '../TransferForm/TransferForm';
import { ActiveAddress } from '@renderer/components/common';
import { Account, MultisigAccount, isMultisig } from '@renderer/domain/account';
import { getAccountsOptions } from '../../common/utils';

type Props = {
  api: ApiPromise;
  chainId: ChainId;
  network: string;
  asset: Asset;
  nativeToken: Asset;
  explorers?: Explorer[];
  addressPrefix: number;
  onAccountChange: (account: Account | MultisigAccount) => void;
  onResult: (transferTx: Transaction, multisig?: { multisigTx: Transaction; description: string }) => void;
};

export const InitOperation = ({
  api,
  chainId,
  network,
  asset,
  nativeToken,
  explorers,
  addressPrefix,
  onResult,
  onAccountChange,
}: Props) => {
  const { t } = useI18n();
  const { getLiveAccounts, getActiveAccounts } = useAccount();

  const accounts = getActiveAccounts();
  const dbAccounts = getLiveAccounts();

  const [activeAccount, setActiveAccount] = useState<DropdownResult<Account | MultisigAccount>>();
  const [accountsOptions, setAccountsOptions] = useState<DropdownOption<Account | MultisigAccount>[]>([]);
  const [activeSignatory, setActiveSignatory] = useState<DropdownResult<MultisigAccount>>();
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
      setActiveSignatory({ id: options[0].id, value: options[0].value });
    }
  }, [activeAccount, dbAccounts]);

  const changeAccount = (account: DropdownResult<Account | MultisigAccount>) => {
    onAccountChange(account.value);
    setActiveAccount(account);
  };

  const accountAddress = activeAccount?.id || '';
  const accountName = activeAccount?.value.name || '';
  const signingType = activeAccount?.value.signingType || SigningType.PARITY_SIGNER;
  const signerAddress = activeSignatory?.id || '';
  const signerName = activeSignatory?.value.name || '';

  return (
    <Plate as="section" className="w-[500px] flex flex-col items-center mx-auto gap-y-2.5">
      <Block className="flex flex-col gap-y-2 p-5">
        {accountsOptions.length > 1 ? (
          <Dropdown
            weight="lg"
            placeholder={t('receive.selectWalletPlaceholder')}
            activeId={activeAccount?.id}
            options={accountsOptions}
            onChange={changeAccount}
          />
        ) : (
          <ActiveAddress
            address={accountAddress}
            accountName={accountName}
            signingType={signingType}
            explorers={explorers}
            addressPrefix={addressPrefix}
          />
        )}

        {isMultisig(activeAccount?.value) &&
          (signatoryOptions.length > 1 ? (
            <Dropdown
              weight="lg"
              placeholder={t('general.input.signerLabel')}
              activeId={activeSignatory?.id}
              options={signatoryOptions}
              onChange={setActiveSignatory}
            />
          ) : (
            <ActiveAddress
              address={signerAddress}
              accountName={signerName}
              signingType={SigningType.PARITY_SIGNER}
              explorers={explorers}
              addressPrefix={addressPrefix}
            />
          ))}
      </Block>

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
    </Plate>
  );
};
