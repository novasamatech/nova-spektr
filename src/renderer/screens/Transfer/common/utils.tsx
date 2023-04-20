import { Account } from '@renderer/domain/account';
import { ChainID, SigningType } from '@renderer/domain/shared-kernel';
import { DropdownOption } from '@renderer/components/ui/Dropdowns/common/types';
import { toAddress } from '@renderer/shared/utils/address';
import { Icon, ChainAddress } from '@renderer/components/ui';
import { SigningBadges } from '@renderer/shared/utils/constants';

export const getAccountsOptions = <T extends Account>(
  chainId: ChainID,
  accounts: T[],
  addressPrefix: number,
): DropdownOption<T>[] => {
  return accounts.reduce<DropdownOption<T>[]>((acc, account) => {
    const address = toAddress(account.accountId, { prefix: addressPrefix });

    const isWatchOnly = account.signingType === SigningType.WATCH_ONLY;
    const isSameChain = !account.chainId || account.chainId === chainId;
    const isNewOption = acc.every((a) => a.id !== address);

    if (!isWatchOnly && isSameChain && isNewOption) {
      const element = (
        <div className="grid grid-rows-2 grid-flow-col gap-x-2.5">
          <Icon className="row-span-2 self-center" name={SigningBadges[account.signingType]} size={34} />
          <p className="text-left text-neutral text-lg font-semibold leading-5">{account.name}</p>
          <ChainAddress type="short" address={address} canCopy={false} />
        </div>
      );

      acc.push({ id: address, value: account, element });
    }

    return acc;
  }, []);
};
