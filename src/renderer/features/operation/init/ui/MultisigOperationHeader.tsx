import { useEffect, useState } from 'react';
import { useUnit } from 'effector-react';

import { DropdownOption, DropdownResult } from '@renderer/shared/ui/Dropdowns/common/types';
import { InputHint, Select } from '@renderer/shared/ui';
import { useI18n } from '@renderer/app/providers';
import { OperationErrorType } from '@renderer/features/operation/init/model';
import type { Account, MultisigAccount } from '@renderer/shared/core';
import { accountModel, walletModel, walletUtils } from '@renderer/entities/wallet';

type Props = {
  account: MultisigAccount;
  invalid?: boolean;
  error?: OperationErrorType;
  getSignatoryOption: (account: Account) => DropdownOption<Account>;
  onSignatoryChange: (account: Account) => void;
};

export const MultisigOperationHeader = ({ account, invalid, error, getSignatoryOption, onSignatoryChange }: Props) => {
  const { t } = useI18n();
  const activeWallet = useUnit(walletModel.$activeWallet);
  const accounts = useUnit(accountModel.$accounts);

  const [signatoryOptions, setSignatoryOptions] = useState<DropdownOption<Account>[]>([]);
  const [activeSignatory, setActiveSignatory] = useState<DropdownResult<Account>>();

  const signatoryIds = account.signatories.map((s) => s.accountId);

  useEffect(() => {
    const signerOptions = accounts.reduce<DropdownOption<Account>[]>((acc, signer) => {
      const isWatchOnly = walletUtils.isWatchOnly(activeWallet);
      const signerExist = signatoryIds.includes(signer.accountId);
      if (!isWatchOnly && signerExist) {
        acc.push(getSignatoryOption(signer));
      }

      return acc;
    }, []);

    if (signerOptions.length === 0) return;

    setSignatoryOptions(signerOptions);
    !activeSignatory && onChange({ id: signerOptions[0].id, value: signerOptions[0].value });
  }, [accounts.length, getSignatoryOption]);

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
