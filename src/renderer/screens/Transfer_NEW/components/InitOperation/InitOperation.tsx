import { ApiPromise } from '@polkadot/api';
import { useState, useEffect } from 'react';

import { Dropdown, Icon, Address } from '@renderer/components/ui';
import { useI18n } from '@renderer/context/I18nContext';
import { DropdownOption, DropdownResult } from '@renderer/components/ui/Dropdowns/common/types';
import { SigningType, ChainId } from '@renderer/domain/shared-kernel';
import { useAccount } from '@renderer/services/account/accountService';
import { formatAddress } from '@renderer/shared/utils/address';
import { Explorers } from '@renderer/components/common';
import { Explorer } from '@renderer/domain/chain';
import { Asset } from '@renderer/domain/asset';
import { Transaction } from '@renderer/domain/transaction';
import { TransferForm } from '../TransferForm/TransferForm';
import { AccountDS } from '@renderer/services/storage';

const getAccountsOptions = (
  chainId: ChainId,
  accounts: AccountDS[],
  addressPrefix: number,
): DropdownOption<string>[] => {
  return accounts.reduce<DropdownOption<string>[]>((acc, account) => {
    const address = formatAddress(account.accountId, addressPrefix);

    const notWatchOnly = account.signingType !== SigningType.WATCH_ONLY;
    const isSameChain = !account.chainId || account.chainId === chainId;
    const isNewOption = acc.every((a) => a.id !== address);

    if (notWatchOnly && isSameChain && isNewOption) {
      const accountType = account.signingType === SigningType.PARITY_SIGNER ? 'paritySignerBg' : 'watchOnlyBg';
      const element = (
        <div className="grid grid-rows-2 grid-flow-col gap-x-2.5">
          <Icon className="row-span-2 self-center" name={accountType} size={34} />
          <p className="text-left text-neutral text-lg font-semibold leading-5">{account.name}</p>
          <Address type="short" address={address} canCopy={false} />
        </div>
      );

      acc.push({ id: address, value: account.name, element });
    }

    return acc;
  }, []);
};

type Props = {
  api: ApiPromise;
  chainId: ChainId;
  network: string;
  asset: Asset;
  explorers?: Explorer[];
  addressPrefix: number;
  onResult: (transaction: Transaction) => void;
};

export const InitOperation = ({ api, chainId, network, asset, explorers, addressPrefix, onResult }: Props) => {
  const { t } = useI18n();
  const { getActiveAccounts } = useAccount();

  const accounts = getActiveAccounts();

  const [activeAccount, setActiveAccount] = useState<DropdownResult<string>>();
  const [accountsOptions, setAccountsOptions] = useState<DropdownOption<string>[]>([]);

  useEffect(() => {
    const options = getAccountsOptions(chainId, accounts, addressPrefix);

    if (options.length === 0) return;

    setAccountsOptions(options);
    setActiveAccount({ id: options[0].id, value: options[0].value });
  }, [accounts.length]);

  const accountAddress = activeAccount?.id || '';
  const accountName = activeAccount?.value || '';

  return (
    <div className="w-[500px] rounded-2lg bg-shade-2 p-5 flex flex-col items-center m-auto gap-2.5">
      {accountsOptions.length > 1 ? (
        <div className="w-full mb-2.5 p-5 bg-white rounded-2lg shadow-surface">
          <Dropdown
            weight="lg"
            placeholder={t('receive.selectWalletPlaceholder')}
            activeId={activeAccount?.id}
            options={accountsOptions}
            onChange={setActiveAccount}
          />
        </div>
      ) : (
        <div className="bg-white shadow-surface p-5 rounded-2xl w-full">
          <div className="flex items-center justify-between h-15 bg-shade-2 p-2.5 rounded-2lg">
            <div className="flex gap-2.5 items-center">
              <Icon name="paritySignerBg" size={34} />
              <div className="flex flex-col">
                <p className="font-bold text-lg leading-5 text-neutral">{accountName}</p>
                <Address className="leading-4" type="short" address={accountAddress} addressStyle="normal" size={14} />
              </div>
            </div>
            <Explorers explorers={explorers} addressPrefix={addressPrefix} address={accountAddress} />
          </div>
        </div>
      )}

      <TransferForm
        api={api}
        chainId={chainId}
        network={network}
        address={accountAddress}
        asset={asset}
        addressPrefix={addressPrefix}
        onSubmit={onResult}
      />
    </div>
  );
};
