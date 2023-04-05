import { Account } from '@renderer/domain/account';
import { ChainId, SigningType } from '@renderer/domain/shared-kernel';
import { DropdownOption } from '@renderer/components/ui/Dropdowns/common/types';
import { formatAddress } from '@renderer/shared/utils/address';
import { Icon, Address } from '@renderer/components/ui';
import { Badges } from './constants';

export const getAccountsOptions = <T extends Account>(
  chainId: ChainId,
  accounts: T[],
  addressPrefix: number,
): DropdownOption<T>[] => {
  return accounts.reduce<DropdownOption<T>[]>((acc, account) => {
    const address = formatAddress(account.accountId, addressPrefix);

    const isWatchOnly = account.signingType === SigningType.WATCH_ONLY;
    const isSameChain = !account.chainId || account.chainId === chainId;
    const isNewOption = acc.every((a) => a.id !== address);

    if (!isWatchOnly && isSameChain && isNewOption) {
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
