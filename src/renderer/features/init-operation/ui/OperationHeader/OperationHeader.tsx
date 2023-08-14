import { PropsWithChildren } from 'react';

import { ChainId } from '@renderer/domain/shared-kernel';
import { Account, isMultisig, MultisigAccount } from '@renderer/entities/account';
import { MultisigOperation } from '@renderer/features/init-operation/ui/MultisigOperation/MultisigOperation';
import { MultishardStaking } from '@renderer/features/init-operation/ui/MultishardStaking/MultishardStaking';
import { MultishardTransfer } from '@renderer/features/init-operation/ui/MultishardTransfer/MultishardTransfer';
import { DropdownOption } from '@renderer/shared/ui/Dropdowns/common/types';

type Props = {
  accounts: Account[] | [MultisigAccount];
  chainId: ChainId;
  isMultiselect?: boolean;
  invalid?: boolean;
  error?: string;
  getAccountOption: (account: Account) => DropdownOption<Account>;
  getSignatoryOption: (account: Account) => DropdownOption<Account>;
  onSignatoryChange: (account: Account) => void;
} & AccountSelectProps;

type SelectAccount = (account: Account) => void;
type MultiselectAccount = (accounts: Account[]) => void;

type AccountSelectProps =
  | { isMultiselect: true; onAccountChange: MultiselectAccount }
  | { onAccountChange: SelectAccount };

export const OperationHeader = ({
  chainId,
  isMultiselect,
  invalid,
  accounts,
  error,
  getSignatoryOption,
  getAccountOption,
  onAccountChange,
  onSignatoryChange,
}: PropsWithChildren<Props>) => {
  const firstAccount = accounts[0];

  // we can select only one shard on staking overview page but we still need to show account selector with one option
  const isMultishard = !isMultisig(firstAccount);

  return (
    <div className="flex flex-col gap-y-4">
      {isMultisig(firstAccount) && (
        <MultisigOperation
          account={firstAccount as MultisigAccount}
          invalid={invalid}
          error={error}
          getSignatoryOption={getSignatoryOption}
          onSignatoryChange={onSignatoryChange}
        />
      )}

      {isMultishard &&
        (isMultiselect ? (
          <MultishardStaking
            accounts={accounts}
            getAccountOption={getAccountOption}
            onAccountsChange={onAccountChange as MultiselectAccount}
          />
        ) : (
          <MultishardTransfer
            accounts={accounts}
            chainId={chainId}
            getAccountOption={getAccountOption}
            onAccountChange={onAccountChange}
          />
        ))}
    </div>
  );
};
