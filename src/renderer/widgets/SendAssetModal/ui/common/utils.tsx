import { ReactNode } from 'react';
import { BN } from '@polkadot/util';

import { AccountAddress, WalletIcon } from '@renderer/entities/wallet';
import { DropdownOption } from '@renderer/shared/ui/Dropdowns/common/types';
import { toAddress, cnTw, transferableAmount } from '@renderer/shared/lib/utils';
import { AssetBalance } from '@renderer/entities/asset';
import { ChainTitle } from '@renderer/entities/chain';
import { FootnoteText, HelpText } from '@renderer/shared/ui';
import type {
  Asset,
  Balance,
  Address,
  Account,
  MultisigAccount,
  Chain,
  ChainId,
  Wallet,
  WalletType,
} from '@renderer/shared/core';

type Params = {
  asset: Asset;
  addressPrefix: number;
  fee?: string;
  deposit?: string;
  amount?: string;
  balance?: Balance;
  nativeBalance?: Balance;
};

const getBalance = (balance: string, asset: Asset, isCorrect = true): ReactNode => {
  if (!balance) return null;

  return <AssetBalance className={cnTw(!isCorrect && 'text-text-negative')} value={balance} asset={asset} />;
};

const getElement = (address: Address, accountName: string, content?: ReactNode): ReactNode => {
  return (
    <div className="flex justify-between w-full">
      <AccountAddress size={20} type="short" address={address} name={accountName} canCopy={false} />
      {content}
    </div>
  );
};

const getWalletElement = (walletType: WalletType, walletName: string, content?: ReactNode): ReactNode => {
  return (
    <div className="flex justify-between items-center w-full">
      <div className="flex gap-x-2 items-center">
        <WalletIcon type={walletType} />

        <FootnoteText className="text-text-secondary">{walletName}</FootnoteText>
      </div>
      {content}
    </div>
  );
};

const validateSignatoryBalance = (balance: string, fee: string, deposit: string): boolean => {
  return new BN(deposit).add(new BN(fee)).lte(new BN(balance));
};

const validateAccountBalance = (balance: string, nativeBalance: string, amount: string, fee: string): boolean => {
  if (nativeBalance) {
    return new BN(amount).lte(new BN(balance)) && new BN(fee).lte(new BN(nativeBalance));
  }

  return new BN(amount).add(new BN(fee)).lte(new BN(balance));
};

export const getSignatoryOption = (
  wallet: Wallet,
  account: Account,
  { balance, asset, fee, deposit }: Params,
): DropdownOption<Account> => {
  const canValidateBalance = balance && fee && deposit;

  let balanceIsCorrect = true;
  if (canValidateBalance) {
    balanceIsCorrect = validateSignatoryBalance(transferableAmount(balance), fee, deposit);
  }

  const balanceContent = getBalance(transferableAmount(balance), asset, balanceIsCorrect);
  const element = getWalletElement(wallet.type, wallet.name, balanceContent);

  return { id: wallet.id + account.accountId + account.name, value: account, element };
};

export const getAccountOption = <T extends Account | MultisigAccount>(
  account: T,
  { balance, asset, fee, addressPrefix, amount, nativeBalance }: Params,
): DropdownOption<T> => {
  const address = toAddress(account.accountId, { prefix: addressPrefix });
  const canValidateBalance = balance && fee && amount;

  let balanceIsCorrect = true;
  if (canValidateBalance) {
    balanceIsCorrect = validateAccountBalance(
      transferableAmount(balance),
      transferableAmount(nativeBalance),
      amount,
      fee,
    );
  }

  const balanceContent = getBalance(transferableAmount(balance), asset, balanceIsCorrect);
  const element = getElement(address, account.name, balanceContent);

  return { id: account.accountId + account.name, value: account, element };
};

export const getChainOption = ({ chainId }: Chain): DropdownOption<ChainId> => {
  const element = <ChainTitle key={chainId} chainId={chainId} fontClass="text-text-primary" />;

  return { id: chainId, value: chainId, element };
};

export const getPlaceholder = (text: string): DropdownOption<string> => {
  const element = <HelpText className="text-text-secondary">{text}</HelpText>;

  return { id: text, value: text, element, disabled: true };
};
