import { useUnit } from 'effector-react';

import { SingleSelectMultishardHeader } from './SingleSelectMultishardHeader';
import { MultiSelectMultishardHeader } from './MultiSelectMultishardHeader';
import { DropdownOption } from '@shared/ui/types';
import { MultisigOperationHeader } from './MultisigOperationHeader';
import { OperationError, OperationErrorType } from '@entities/transaction';
import { accountUtils, walletModel, walletUtils } from '@entities/wallet';
import type { Account, ChainId, MultisigAccount, Wallet } from '@shared/core';

type Props = {
  accounts: Account[] | [MultisigAccount];
  chainId: ChainId;
  isMultiselect?: boolean;
  errors?: OperationErrorType[];
  getAccountOption: (account: Account) => DropdownOption<Account>;
  getSignatoryOption: (wallet: Wallet, account: Account) => DropdownOption<Account>;
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
  errors = [],
  getSignatoryOption,
  getAccountOption,
  onAccountChange,
  onSignatoryChange,
}: Props) => {
  const firstAccount = accounts[0];

  const activeWallet = useUnit(walletModel.$activeWallet);

  const isMultisig = walletUtils.isMultisig(activeWallet);
  const isMultishard = walletUtils.isPolkadotVault(activeWallet) || walletUtils.isMultiShard(activeWallet);

  const multisigError = (isMultisig && errors.find((e) => e === OperationError.INVALID_DEPOSIT)) || undefined;
  const multishardError = (isMultishard && errors.find((e) => e === OperationError.INVALID_FEE)) || undefined;
  const emptyError = errors.find((e) => e === OperationError.EMPTY_ERROR);

  const availableShards = walletUtils.isPolkadotVault(activeWallet)
    ? accounts.filter((a) => !accountUtils.isBaseAccount(a))
    : accounts;

  return (
    <div className="flex flex-col gap-y-4">
      {isMultisig && (
        <MultisigOperationHeader
          chainId={chainId}
          account={firstAccount as MultisigAccount}
          invalid={Boolean(multisigError || emptyError)}
          error={multisigError}
          getSignatoryOption={getSignatoryOption}
          onSignatoryChange={onSignatoryChange}
        />
      )}

      {isMultishard &&
        (isMultiselect ? (
          <SingleSelectMultishardHeader
            accounts={availableShards}
            invalid={Boolean(multishardError || emptyError)}
            error={multishardError}
            getAccountOption={getAccountOption}
            onAccountsChange={onAccountChange as MultiselectAccount}
          />
        ) : (
          <MultiSelectMultishardHeader
            accounts={availableShards}
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
