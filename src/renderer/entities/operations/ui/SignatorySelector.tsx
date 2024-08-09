import { type BN } from '@polkadot/util';
import { useMemo } from 'react';

import { useI18n } from '@app/providers';
import { type Account, type Asset } from '@shared/core';
import { toAddress } from '@shared/lib/utils';
import { InputHint, Select } from '@shared/ui';
import { type DropdownOption } from '@shared/ui/types';
import { AssetBalance } from '../../asset';
import { AccountAddress, accountUtils } from '../../wallet';

type Props = {
  signatory?: Account | null;
  signatories: { signer: Account; balance: BN | string }[];
  asset?: Asset;
  addressPrefix: number;
  hasError: boolean;
  errorText: string;
  onChange: (signatory: Account) => void;
};

export const SignatorySelector = ({
  signatory,
  signatories,
  asset,
  addressPrefix,
  hasError,
  errorText,
  onChange,
}: Props) => {
  const { t } = useI18n();

  const options = useMemo(
    () =>
      signatories.map<DropdownOption>(({ signer, balance }) => {
        const isShard = accountUtils.isShardAccount(signer);
        const address = toAddress(signer.accountId, { prefix: addressPrefix });

        return {
          id: signer.id.toString(),
          value: signer,
          element: (
            <div className="flex w-full items-center justify-between">
              <AccountAddress
                size={20}
                type="short"
                address={address}
                name={isShard ? address : signer.name}
                canCopy={false}
              />
              <AssetBalance value={balance.toString()} asset={asset} />
            </div>
          ),
        };
      }, []),
    [signatories],
  );

  return (
    <div className="flex flex-col gap-y-2">
      <Select
        label={t('proxy.addProxy.signatoryLabel')}
        placeholder={t('proxy.addProxy.signatoryPlaceholder')}
        selectedId={signatory?.id?.toString()}
        options={options}
        invalid={hasError}
        onChange={({ value }) => onChange(value)}
      />
      <InputHint variant="error" active={hasError}>
        {errorText}
      </InputHint>
    </div>
  );
};
