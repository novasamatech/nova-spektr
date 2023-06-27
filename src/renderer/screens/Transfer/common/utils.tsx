import { ReactNode } from 'react';
import { BN } from '@polkadot/util';

import { Account, MultisigAccount } from '@renderer/domain/account';
import { Address } from '@renderer/domain/shared-kernel';
import { DropdownOption } from '@renderer/components/ui/Dropdowns/common/types';
import { toAddress } from '@renderer/shared/utils/address';
import { AccountAddress, BalanceNew } from '@renderer/components/common';
import { Balance } from '@renderer/domain/balance';
import cnTw from '@renderer/shared/utils/twMerge';
import { Asset } from '@renderer/domain/asset';
import { transferableAmount } from '@renderer/shared/utils/balance';

type Params = {
  asset: Asset;
  addressPrefix: number;
  fee?: string;
  deposit?: string;
  amount?: string;
  balance?: Balance;
};

const getBalance = (balance: string, asset: Asset, isCorrect = true): ReactNode => {
  if (!balance) return null;

  return <BalanceNew className={cnTw(!isCorrect && 'text-text-negative')} value={balance} asset={asset} />;
};

const getElement = (address: Address, accountName: string, content?: ReactNode): ReactNode => {
  return (
    <div className="flex justify-between w-full">
      <AccountAddress size={20} type="short" address={address} name={accountName} canCopy={false} />
      {content}
    </div>
  );
};

const validateSignatoryBalance = (balance: string, fee: string, deposit: string): boolean => {
  return new BN(deposit).add(new BN(fee)).lte(new BN(balance));
};

const validateAccountBalance = (balance: string, amount: string, fee: string): boolean => {
  return new BN(amount).add(new BN(fee)).lte(new BN(balance));
};

export const getSignatoryOption = (
  account: Account,
  { balance, asset, addressPrefix, fee, deposit }: Params,
): DropdownOption<Account> => {
  const address = toAddress(account.accountId, { prefix: addressPrefix });
  const canValidateBalance = balance && fee && deposit;

  let balanceIsCorrect = true;
  if (canValidateBalance) {
    balanceIsCorrect = validateSignatoryBalance(transferableAmount(balance), fee, deposit);
  }

  const balanceContent = getBalance(transferableAmount(balance), asset, balanceIsCorrect);
  const element = getElement(address, account.name, balanceContent);

  return { id: account.accountId + account.name, value: account, element };
};

export const getAccountOption = <T extends Account | MultisigAccount>(
  account: T,
  { balance, asset, fee, addressPrefix, amount }: Params,
): DropdownOption<T> => {
  const address = toAddress(account.accountId, { prefix: addressPrefix });
  const canValidateBalance = balance && fee && amount;

  let balanceIsCorrect = true;
  if (canValidateBalance) {
    balanceIsCorrect = validateAccountBalance(transferableAmount(balance), amount, fee);
  }

  const balanceContent = getBalance(transferableAmount(balance), asset, balanceIsCorrect);
  const element = getElement(address, account.name, balanceContent);

  return { id: account.accountId + account.name, value: account, element };
};
