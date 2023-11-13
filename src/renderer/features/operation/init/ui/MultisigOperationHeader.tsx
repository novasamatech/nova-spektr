import { useEffect, useState } from 'react';
import { useUnit } from 'effector-react';

import { DropdownOption, DropdownResult } from '@renderer/shared/ui/Dropdowns/common/types';
import { InputHint, Select } from '@renderer/shared/ui';
import { useI18n } from '@renderer/app/providers';
import { OperationErrorType } from '@renderer/entities/transaction';
import type { Account, ChainId, MultisigAccount, Wallet } from '@renderer/shared/core';
import { accountUtils, walletModel, walletUtils } from '@renderer/entities/wallet';

type Props = {
  chainId: ChainId;
  account?: MultisigAccount;
  invalid?: boolean;
  error?: OperationErrorType;
  getSignatoryOption: (wallet: Wallet, account: Account) => DropdownOption<Account>;
  onSignatoryChange: (account: Account) => void;
};

export const MultisigOperationHeader = ({
  chainId,
  account,
  invalid,
  error,
  getSignatoryOption,
  onSignatoryChange,
}: Props) => {
  const { t } = useI18n();

  const accounts = useUnit(walletModel.$accounts);
  const wallets = useUnit(walletModel.$wallets);

  const [signatoryOptions, setSignatoryOptions] = useState<DropdownOption<Account>[]>([]);
  const [activeSignatory, setActiveSignatory] = useState<DropdownResult<Account>>();

  const signatoryIds = account?.signatories.map((s) => s.accountId) || [];

  useEffect(() => {
    const signerOptions = wallets.reduce<DropdownOption<Account>[]>((acc, wallet) => {
      const isWatchOnly = walletUtils.isWatchOnly(wallet);
      const walletAccounts = accountUtils.getWalletAccounts(wallet.id, accounts);

      const signer = walletAccounts.find(
        (a) => signatoryIds.includes(a.accountId) && accountUtils.isChainIdMatch(a, chainId),
      );

      if (!isWatchOnly && signer) {
        acc.push(getSignatoryOption(wallet, signer));
      }

      return acc;
    }, []);

    if (signerOptions.length === 0) return;

    setSignatoryOptions(signerOptions);
    !activeSignatory && onChange({ id: signerOptions[0].id, value: signerOptions[0].value });
  }, [wallets.length, accounts.length, getSignatoryOption, signatoryIds.length]);

  const onChange = (signatory: DropdownResult<Account>) => {
    onSignatoryChange(signatory.value);
    setActiveSignatory(signatory);
  };

  return (
    <div className="flex flex-col gap-y-2 mb-4" data-testid="signatory-select">
      <Select
        label={t('staking.bond.signatoryLabel')}
        placeholder={t('staking.bond.signatoryPlaceholder')}
        disabled={!signatoryOptions.length}
        invalid={invalid}
        selectedId={activeSignatory?.id}
        options={signatoryOptions}
        onChange={onChange}
      />
      <InputHint active={!signatoryOptions.length} variant="error">
        {t('multisigOperations.noSignatory')}
      </InputHint>
      <InputHint active={Boolean(error)} variant="error">
        {t(error || '')}
      </InputHint>
    </div>
  );
};
