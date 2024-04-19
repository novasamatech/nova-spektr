import { useI18n } from '@app/providers';
import { toAddress } from '@shared/lib/utils';
import { Select, InputHint } from '@shared/ui';
import { Account_NEW, Asset } from '@shared/core';
import type { DropdownOption } from '@shared/ui/types';
import { AssetBalance } from '../../asset';
import { accountUtils, AccountAddress } from '../../wallet';

type Props = {
  signatory?: Account_NEW;
  signatories: { signer: Account_NEW; balance: string }[];
  asset?: Asset;
  addressPrefix: number;
  hasError: boolean;
  errorText: string;
  onChange: (signatory: Account_NEW) => void;
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

  const options = signatories.reduce<DropdownOption[]>((acc, { signer, balance }) => {
    const isShard = accountUtils.isShardAccount(signer);
    const address = toAddress(signer.accountId, { prefix: addressPrefix });

    acc.push({
      id: signer.id.toString(),
      value: signer,
      element: (
        <div className="flex justify-between items-center w-full">
          <AccountAddress
            size={20}
            type="short"
            address={address}
            name={isShard ? address : signer.name}
            canCopy={false}
          />
          <AssetBalance value={balance} asset={asset} />
        </div>
      ),
    });

    return acc;
  }, []);

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
