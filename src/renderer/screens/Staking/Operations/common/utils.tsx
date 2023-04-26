import { BN } from '@polkadot/util';
import cn from 'classnames';

import { Account } from '@renderer/domain/account';
import { Address, SigningType } from '@renderer/domain/shared-kernel';
import { DropdownOption } from '@renderer/components/ui/Dropdowns/common/types';
import { Icon, ChainAddress, Balance } from '@renderer/components/ui';
import { Balance as AccountBalance } from '@renderer/domain/balance';
import { stakeableAmount, formatAmount, transferableAmount, unlockingAmount } from '@renderer/shared/utils/balance';
import { Asset } from '@renderer/domain/asset';
import { toAddress } from '@renderer/shared/utils/address';
import { Stake } from '@renderer/domain/stake';
import { AccountDS } from '@renderer/services/storage';

export const validateBalanceForFee = (balance: AccountBalance | string, fee: string): boolean => {
  const transferableBalance = typeof balance === 'string' ? balance : transferableAmount(balance);

  return new BN(fee).lte(new BN(transferableBalance));
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

type Params = {
  asset: Asset;
  addressPrefix: number;
  walletName?: string;
  fee?: string;
  amount?: string;
  balance?: AccountBalance;
};
type ParamsWithStake = Params & {
  stake?: Stake;
};

export const getStakeAccountOption = (
  account: Account,
  { walletName, balance, asset, fee, addressPrefix, amount = '0' }: Params,
): DropdownOption<Address> => {
  const address = toAddress(account.accountId, { prefix: addressPrefix });
  const canValidateBalance = balance && amount && fee;

  let balanceIsCorrect = true;
  if (canValidateBalance) {
    const bondIsValid = validateStake(balance, amount, asset.precision);
    const feeIsValid = validateBalanceForFee(balance, fee);
    balanceIsCorrect = bondIsValid && feeIsValid;
  }

  const balanceContent = balance && (
    <div className="flex items-center gap-x-1">
      {!balanceIsCorrect && <Icon size={12} className="text-error" name="warnCutout" />}

      <Balance
        className={cn(!balanceIsCorrect && 'text-error')}
        value={stakeableAmount(balance)}
        precision={asset.precision}
        symbol={asset.symbol}
      />
    </div>
  );

  const element = (
    <div className="flex justify-between items-center gap-x-2.5">
      <div className="flex gap-x-[5px] items-center">
        <ChainAddress
          address={address}
          name={account.name}
          subName={walletName}
          signType={account.signingType}
          size={30}
          canCopy={false}
        />
      </div>
      {balanceContent}
    </div>
  );

  return { id: account.accountId, value: address, element };
};

export const getRestakeAccountOption = (
  account: Account,
  { walletName, balance, stake, asset, fee, addressPrefix, amount = '0' }: ParamsWithStake,
): DropdownOption<Address> => {
  const address = toAddress(account.accountId, { prefix: addressPrefix });
  const canValidateBalance = balance && stake && amount && fee;

  let balanceIsCorrect = true;
  if (canValidateBalance) {
    const restakeIsValid = validateRestake(stake, amount, asset.precision);
    const feeIsValid = validateBalanceForFee(balance, fee);
    balanceIsCorrect = restakeIsValid && feeIsValid;
  }

  const balanceContent = stake && (
    <div className="flex items-center gap-x-1">
      {!balanceIsCorrect && <Icon size={12} className="text-error" name="warnCutout" />}

      <Balance
        className={cn(!balanceIsCorrect && 'text-error')}
        value={unlockingAmount(stake.unlocking)}
        precision={asset.precision}
        symbol={asset.symbol}
      />
    </div>
  );

  const element = (
    <div className="flex justify-between items-center gap-x-2.5">
      <div className="flex gap-x-[5px] items-center">
        <ChainAddress
          address={address}
          name={account.name}
          subName={walletName}
          signType={account.signingType}
          size={30}
          canCopy={false}
        />
      </div>
      {balanceContent}
    </div>
  );

  return { id: account.accountId, value: address, element };
};

export const getUnstakeAccountOption = (
  account: Account,
  { walletName, balance, stake, asset, fee, addressPrefix, amount = '0' }: ParamsWithStake,
): DropdownOption<Address> => {
  const address = toAddress(account.accountId, { prefix: addressPrefix });
  const canValidateBalance = balance && stake && amount && fee;

  let balanceIsCorrect = true;
  if (canValidateBalance) {
    const restakeIsValid = validateUnstake(stake, amount, asset.precision);
    const feeIsValid = validateBalanceForFee(balance, fee);
    balanceIsCorrect = restakeIsValid && feeIsValid;
  }

  const balanceContent = stake && (
    <div className="flex items-center gap-x-1">
      {!balanceIsCorrect && <Icon size={12} className="text-error" name="warnCutout" />}

      <Balance
        className={cn(!balanceIsCorrect && 'text-error')}
        value={stake.active}
        precision={asset.precision}
        symbol={asset.symbol}
      />
    </div>
  );

  const element = (
    <div className="flex justify-between items-center gap-x-2.5">
      <div className="flex gap-x-[5px] items-center">
        <ChainAddress
          address={address}
          name={account.name}
          subName={walletName}
          signType={account.signingType}
          size={30}
          canCopy={false}
        />
      </div>
      {balanceContent}
    </div>
  );

  return { id: account.accountId, value: address, element };
};

export const getTotalAccounts = (dbAccounts: AccountDS[], identifiers: string[]): AccountDS[] => {
  return dbAccounts.filter((account) => {
    if (!account.id) return false;

    const correctSigningType = [SigningType.PARITY_SIGNER, SigningType.MULTISIG].includes(account.signingType);
    const accountExistInDb = identifiers.includes(account.id.toString());

    return correctSigningType && accountExistInDb;
  });
};

// export const getAccountsOptions = <T extends Account>(
//   chainId: ChainId,
//   accounts: T[],
//   addressPrefix: number,
// ): DropdownOption<T>[] => {
//   return accounts.reduce<DropdownOption<T>[]>((acc, account) => {
//     const address = toAddress(account.accountId, { prefix: addressPrefix });
//
//     const isWatchOnly = account.signingType === SigningType.WATCH_ONLY;
//     const isSameChain = !account.chainId || account.chainId === chainId;
//     const isNewOption = acc.every((a) => a.id !== address);
//
//     if (!isWatchOnly && isSameChain && isNewOption) {
//       const element = (
//         <div className="grid grid-rows-2 grid-flow-col gap-x-2.5">
//           <Icon className="row-span-2 self-center" name={SigningBadges[account.signingType]} size={34} />
//           <p className="text-left text-neutral text-lg font-semibold leading-5">{account.name}</p>
//           <ChainAddress type="short" address={address} canCopy={false} />
//         </div>
//       );
//
//       acc.push({ id: address, value: account, element });
//     }
//
//     return acc;
//   }, []);
// };
