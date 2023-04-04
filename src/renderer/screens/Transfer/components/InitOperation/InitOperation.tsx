import { ApiPromise } from '@polkadot/api';
import { useState, useEffect } from 'react';

import { Dropdown, Icon, Address, Plate, Block } from '@renderer/components/ui';
import { useI18n } from '@renderer/context/I18nContext';
import { DropdownOption, DropdownResult } from '@renderer/components/ui/Dropdowns/common/types';
import { SigningType, ChainId } from '@renderer/domain/shared-kernel';
import { useAccount } from '@renderer/services/account/accountService';
import { formatAddress } from '@renderer/shared/utils/address';
import { Explorer } from '@renderer/domain/chain';
import { Asset } from '@renderer/domain/asset';
import { Transaction } from '@renderer/domain/transaction';
import { IconNames } from '@renderer/components/ui/Icon/data';
import { TransferForm } from '../TransferForm/TransferForm';
import { ActiveAddress } from '@renderer/screens/Transfer/components';
import { Account, MultisigAccount, isMultisig } from '@renderer/domain/account';

const Badges: Record<SigningType, IconNames> = {
  [SigningType.WATCH_ONLY]: 'watchOnlyBg',
  [SigningType.PARITY_SIGNER]: 'paritySignerBg',
  [SigningType.MULTISIG]: 'multisigBg',
};

const getAccountsOptions = <T extends Account>(
  chainId: ChainId,
  accounts: T[],
  addressPrefix: number,
): DropdownOption<T>[] => {
  return accounts.reduce<DropdownOption<T>[]>((acc, account) => {
    const address = formatAddress(account.accountId, addressPrefix);

    const notWatchOnly = account.signingType !== SigningType.WATCH_ONLY;
    const isSameChain = !account.chainId || account.chainId === chainId;
    const isNewOption = acc.every((a) => a.id !== address);

    if (notWatchOnly && isSameChain && isNewOption) {
      const element = (
        <div className="grid grid-rows-2 grid-flow-col gap-x-2.5">
          <Icon className="row-span-2 self-center" name={Badges[account.signingType]} size={34} />
          <p className="text-left text-neutral text-lg font-semibold leading-5">{account.name}</p>
          <Address type="short" address={address} canCopy={false} />
        </div>
      );

      acc.push({ id: address, value: account, element });
    }

    return acc;
  }, []);
};

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
  const { getActiveAccounts } = useAccount();

  const accounts = getActiveAccounts();

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
      const signatories = activeAccount.value.signatories.map((s) => s.publicKey);
      const signers = accounts.filter((a) => a.publicKey && signatories.includes(a.publicKey)) as MultisigAccount[];

      const options = getAccountsOptions<MultisigAccount>(chainId, signers, addressPrefix);

      if (options.length === 0) return;

      setSignatoryOptions(options);
      setActiveSignatory({ id: options[0].id, value: options[0].value });
    }
  }, [activeAccount]);

  const changeAccount = (account: DropdownResult<Account | MultisigAccount>) => {
    onAccountChange(account.value);
    setActiveAccount(account);
  };

  const accountAddress = activeAccount?.id || '';
  const accountName = activeAccount?.value.name || '';
  const signerAddress = activeSignatory?.id || '';
  const signerName = activeSignatory?.value.name || '';
  const signingType = activeSignatory?.value.signingType || SigningType.PARITY_SIGNER;

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
              placeholder="Select signer"
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
        signer={signerAddress}
        asset={asset}
        nativeToken={nativeToken}
        addressPrefix={addressPrefix}
        onSubmit={onResult}
      />
    </Plate>
  );
};
