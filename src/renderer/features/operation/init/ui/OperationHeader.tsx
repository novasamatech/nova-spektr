import { ChainId } from '@renderer/domain/shared-kernel';
import { Account, isMultishard, isMultisig, MultisigAccount } from '@renderer/entities/account';
import { SingleSelectMultishardHeader } from './SingleSelectMultishardHeader';
import { MultiSelectMultishardHeader } from './MultiSelectMultishardHeader';
import { DropdownOption } from '@renderer/shared/ui/Dropdowns/common/types';
import { MultisigOperationHeader } from './MultisigOperationHeader';
import { OperationError, OperationErrorType } from '@renderer/features/operation/init/model';

type Props = {
  accounts: Account[] | [MultisigAccount];
  chainId: ChainId;
  isMultiselect?: boolean;
  invalid?: boolean;
  errors?: OperationErrorType[];
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
  accounts,
  invalid,
  errors = [],
  getSignatoryOption,
  getAccountOption,
  onAccountChange,
  onSignatoryChange,
}: Props) => {
  const firstAccount = accounts[0];

  const accountIsMultisig = isMultisig(firstAccount);
  const accountIsMultishard = isMultishard(firstAccount);

  const multisigError = (accountIsMultisig && errors.find((e) => e === OperationError.INVALID_DEPOSIT)) || undefined;
  const multishardError = (accountIsMultishard && errors.find((e) => e === OperationError.INVALID_FEE)) || undefined;
  const emptyError = errors.find((e) => e === OperationError.EMPTY_ERROR);

  return (
    <div className="flex flex-col gap-y-4">
      {accountIsMultisig && (
        <MultisigOperationHeader
          account={firstAccount}
          invalid={Boolean(multisigError || emptyError)}
          error={multisigError}
          getSignatoryOption={getSignatoryOption}
          onSignatoryChange={onSignatoryChange}
        />
      )}

      {accountIsMultishard &&
        (isMultiselect ? (
          <SingleSelectMultishardHeader
            accounts={accounts}
            invalid={Boolean(multishardError || emptyError)}
            error={multishardError}
            getAccountOption={getAccountOption}
            onAccountsChange={onAccountChange as MultiselectAccount}
          />
        ) : (
          <MultiSelectMultishardHeader
            accounts={accounts}
            invalid={Boolean(multishardError || emptyError)}
            error={multishardError}
            chainId={chainId}
            getAccountOption={getAccountOption}
            onAccountChange={onAccountChange}
          />
        ))}
    </div>
  );
};
