import { Account } from '@renderer/domain/account';
import { ChainId, SigningType } from '@renderer/domain/shared-kernel';
import { DropdownOption } from '@renderer/components/ui/Dropdowns/common/types';
import { toAddress } from '@renderer/shared/utils/address';
import { ChainAddress } from '@renderer/components/ui';

export const getAccountsOptions = <T extends Account>(
  chainId: ChainId,
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
        <div className="flex justify-between">
          <ChainAddress size={20} type="short" address={address} name={account.name} canCopy={false} />
        </div>
      );

      acc.push({ id: address, value: account, element });
    }

    return acc;
  }, []);
};
