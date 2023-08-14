import { useEffect, useState } from 'react';

import { DropdownOption, DropdownResult } from '@renderer/shared/ui/Dropdowns/common/types';
import { Account, MultisigAccount, useAccount } from '@renderer/entities/account';
import { SigningType } from '@renderer/domain/shared-kernel';
import { InputHint, Select } from '@renderer/shared/ui';
import { useI18n } from '@renderer/app/providers';

type Props = {
  account: MultisigAccount;
  invalid?: boolean;
  error?: string;
  getSignatoryOption: (account: Account) => DropdownOption<Account>;
  onSignatoryChange: (account: Account) => void;
};

export const MultisigOperation = ({ account, invalid, error, getSignatoryOption, onSignatoryChange }: Props) => {
  const { t } = useI18n();
  const { getLiveAccounts } = useAccount();

  const [signatoryOptions, setSignatoryOptions] = useState<DropdownOption<Account>[]>([]);
  const [activeSignatory, setActiveSignatory] = useState<DropdownResult<Account>>();

  const dbAccounts = getLiveAccounts();

  const signatoryIds = account.signatories.map((s) => s.accountId);

  useEffect(() => {
    const signerOptions = dbAccounts.reduce<DropdownOption<Account>[]>((acc, signer) => {
      const isWatchOnly = signer.signingType === SigningType.WATCH_ONLY;
      const signerExist = signatoryIds.includes(signer.accountId);
      if (!isWatchOnly && signerExist) {
        acc.push(getSignatoryOption(signer));
      }

      return acc;
    }, []);

    if (signerOptions.length === 0) return;

    setSignatoryOptions(signerOptions);
    !activeSignatory && onChange({ id: signerOptions[0].id, value: signerOptions[0].value });
  }, [dbAccounts.length, getSignatoryOption]);

  const onChange = (signatory: DropdownResult<Account>) => {
    onSignatoryChange(signatory.value);
    setActiveSignatory(signatory);
  };

  return (
    <div className="flex flex-col gap-y-2 mb-4">
      <Select
        label={t('staking.bond.signatoryLabel')}
        placeholder={t('staking.bond.signatoryPlaceholder')}
        disabled={!signatoryOptions.length}
        invalid={invalid}
        selectedId={activeSignatory?.id}
        options={signatoryOptions}
        onChange={onChange}
      />
      <InputHint active={!signatoryOptions.length}>{t('multisigOperations.noSignatory')}</InputHint>
      <InputHint active={Boolean(error)}>{error}</InputHint>
    </div>
  );
};
