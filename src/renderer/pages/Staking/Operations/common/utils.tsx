import { BN } from '@polkadot/util';
import cn from 'classnames';
import { ReactNode } from 'react';

import { AccountAddress, accountUtils, WalletIcon, walletUtils } from '@entities/wallet';
import { DropdownOption } from '@shared/ui/types';
import { AssetBalance } from '@entities/asset';
import { FootnoteText } from '@shared/ui';
import { WalletType } from '@shared/core';
import type {
  Address,
  Stake,
  Account,
  MultisigAccount,
  Asset,
  Balance as AccountBalance,
  Wallet,
  ChainId,
} from '@shared/core';
import {
  toAddress,
  stakeableAmount,
  formatAmount,
  transferableAmount,
  unlockingAmount,
  redeemableAmount,
  dictionary,
} from '@shared/lib/utils';

export const validateBalanceForFee = (balance: AccountBalance | string, fee: string): boolean => {
  const transferableBalance = typeof balance === 'string' ? balance : transferableAmount(balance);

  return new BN(fee).lte(new BN(transferableBalance));
};

export const validateBalanceForFeeDeposit = (
  balance: AccountBalance | string,
  deposit: string,
  fee: string,
): boolean => {
  const transferableBalance = typeof balance === 'string' ? balance : transferableAmount(balance);

  return new BN(deposit).add(new BN(fee)).lte(new BN(transferableBalance));
};

export const validateStake = (
  balance: AccountBalance | string,
  amount: string,
  precision: number,
  fee?: string,
): boolean => {
  const stakeableBalance = typeof balance === 'string' ? balance : stakeableAmount(balance);

  let formattedAmount = new BN(formatAmount(amount, precision));
  if (fee) {
    formattedAmount = formattedAmount.add(new BN(fee));
  }

  return formattedAmount.lte(new BN(stakeableBalance));
};

export const validateRestake = (stake: Stake | string, amount: string, precision: number): boolean => {
  const unstakeableBalance = typeof stake === 'string' ? stake : unlockingAmount(stake.unlocking);

  return new BN(formatAmount(amount, precision)).lte(new BN(unstakeableBalance));
};

export const validateUnstake = (stake: Stake | string, amount: string, precision: number): boolean => {
  const unstakeableBalance = typeof stake === 'string' ? stake : stake.active;

  return new BN(formatAmount(amount, precision)).lte(new BN(unstakeableBalance));
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

const getBalance = (balance: string, asset: Asset, isCorrect = true): ReactNode => {
  if (!balance) return null;

  return <AssetBalance className={cn(!isCorrect && 'text-text-negative')} value={balance} asset={asset} />;
};

type Params = {
  asset: Asset;
  addressPrefix: number;
  fee?: string;
  amount?: string;
  balance?: AccountBalance;
  deposit?: string;
};
type ParamsWithStake = Params & {
  stake?: Stake;
  era?: number;
};

export const getGeneralAccountOption = <T extends Account | MultisigAccount>(
  account: T,
  { balance, asset, fee, addressPrefix }: Params,
): DropdownOption<T> => {
  const address = toAddress(account.accountId, { prefix: addressPrefix });
  const canValidateBalance = balance && fee;

  let balanceIsCorrect = true;
  if (canValidateBalance) {
    balanceIsCorrect = validateBalanceForFee(balance, fee);
  }

  const balanceContent = getBalance(transferableAmount(balance), asset, balanceIsCorrect);
  const element = getElement(address, account.name, balanceContent);

  return { id: account.accountId, value: account, element };
};

export const getStakeAccountOption = <T extends Account | MultisigAccount>(
  account: T,
  { balance, asset, fee, addressPrefix, amount = '0' }: Params,
): DropdownOption<T> => {
  const address = toAddress(account.accountId, { prefix: addressPrefix });
  const canValidateBalance = balance && fee;

  let balanceIsCorrect = true;
  if (canValidateBalance) {
    balanceIsCorrect = validateStake(balance, amount, asset.precision, fee);
  }

  const balanceContent = getBalance(stakeableAmount(balance), asset, balanceIsCorrect);
  const element = getElement(address, account.name, balanceContent);

  return { id: account.accountId, value: account, element };
};

export const getPayoutAccountOption = (
  account: Account,
  { balance, asset, addressPrefix }: Params,
): DropdownOption<Address> => {
  const address = toAddress(account.accountId, { prefix: addressPrefix });

  const balanceContent = getBalance(transferableAmount(balance), asset);
  const element = getElement(address, account.name, balanceContent);

  return { id: account.accountId, value: address, element };
};

export const getRedeemAccountOption = <T extends Account | MultisigAccount>(
  account: T,
  { asset, stake, era, addressPrefix }: ParamsWithStake,
): DropdownOption<T> => {
  const address = toAddress(account.accountId, { prefix: addressPrefix });
  const canDisplayRedeem = stake && era;

  const balanceContent = canDisplayRedeem && getBalance(redeemableAmount(stake.unlocking, era), asset);
  const element = getElement(address, account.name, balanceContent);

  return { id: account.accountId, value: account, element };
};

export const getRestakeAccountOption = (
  account: Account,
  { balance, stake, asset, fee, addressPrefix, amount = '0' }: ParamsWithStake,
): DropdownOption<Account> => {
  const address = toAddress(account.accountId, { prefix: addressPrefix });
  const canValidateBalance = balance && stake && fee;

  let balanceIsCorrect = true;
  if (canValidateBalance) {
    const restakeIsValid = validateRestake(stake, amount, asset.precision);
    const feeIsValid = validateBalanceForFee(balance, fee);
    balanceIsCorrect = restakeIsValid && feeIsValid;
  }

  const balanceContent = getBalance(unlockingAmount(stake?.unlocking), asset, balanceIsCorrect);
  const element = getElement(address, account.name, balanceContent);

  return { id: account.accountId, value: account, element };
};

export const getUnstakeAccountOption = (
  account: Account,
  { balance, stake, asset, fee, addressPrefix, amount = '0' }: ParamsWithStake,
): DropdownOption<Account> => {
  const address = toAddress(account.accountId, { prefix: addressPrefix });
  const canValidateBalance = balance && stake && fee;

  let balanceIsCorrect = true;
  if (canValidateBalance) {
    const restakeIsValid = validateUnstake(stake, amount, asset.precision);
    const feeIsValid = validateBalanceForFee(balance, fee);
    balanceIsCorrect = restakeIsValid && feeIsValid;
  }

  const balanceContent = getBalance(stake?.active || '', asset, balanceIsCorrect);
  const element = getElement(address, account.name, balanceContent);

  return { id: account.accountId, value: account, element };
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

export const getDestinationAccounts = (accounts: Account[], wallets: Wallet[], chainId: ChainId) => {
  const walletsMap = dictionary(wallets, 'id', walletUtils.isPolkadotVault);

  return accounts.filter(
    (a) => (!accountUtils.isBaseAccount(a) || !walletsMap[a.walletId]) && accountUtils.isChainIdMatch(a, chainId),
  );
};
