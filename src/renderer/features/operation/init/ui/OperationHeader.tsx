import { ChainId } from '@renderer/domain/shared-kernel';
import { Account, isMultishard, isMultisig, MultisigAccount } from '@renderer/entities/account';
import { SingleSelectMultishardHeader } from './SingleSelectMultishardHeader';
import { MultiSelectMultishardHeader } from './MultiSelectMultishardHeader';
import { DropdownOption } from '@renderer/shared/ui/Dropdowns/common/types';
import { MultisigOperationHeader } from './MultisigOperationHeader';

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
}: Props) => {
  const firstAccount = accounts[0];

  return (
    <div className="flex flex-col gap-y-4">
      {isMultisig(firstAccount) && (
        <MultisigOperationHeader
          account={firstAccount as MultisigAccount}
          invalid={invalid}
          error={error}
          getSignatoryOption={getSignatoryOption}
          onSignatoryChange={onSignatoryChange}
        />
      )}

      {isMultishard(firstAccount) &&
        (isMultiselect ? (
          <SingleSelectMultishardHeader
            accounts={accounts}
            getAccountOption={getAccountOption}
            onAccountsChange={onAccountChange as MultiselectAccount}
          />
        ) : (
          <MultiSelectMultishardHeader
            accounts={accounts}
            chainId={chainId}
            getAccountOption={getAccountOption}
            onAccountChange={onAccountChange}
          />
        ))}
    </div>
  );
};
