import { type BN } from '@polkadot/util';

import { type Asset } from '@/shared/core';
import { useI18n } from '@/shared/i18n';
import { toAddress } from '@/shared/lib/utils';
import { InputHint } from '@/shared/ui';
import { Address } from '@/shared/ui-entities';
import { Field, Select } from '@/shared/ui-kit';
import { type AnyAccount } from '@/domains/network';
import { AssetBalance } from '@/entities/asset';
import { accountUtils } from '@/entities/wallet';

type Props = {
  signatory?: AnyAccount | null;
  signatories: { signer: AnyAccount; balance: BN | string }[];
  asset?: Asset;
  addressPrefix: number;
  hasError: boolean;
  errorText: string;
  onChange: (signatory: AnyAccount) => void;
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

  const selectSigner = (signerId: string) => {
    const selectedSigner = signatories.find(({ signer }) => signer.id === signerId);
    if (!selectedSigner) return;

    onChange(selectedSigner.signer);
  };

  return (
    <Field text={t('proxy.addProxy.signatoryLabel')}>
      <Select
        placeholder={t('proxy.addProxy.signatoryPlaceholder')}
        value={signatory?.id.toString() ?? null}
        invalid={hasError}
        onChange={(value) => selectSigner(value)}
      >
        {signatories.map(({ signer, balance }) => {
          const isShard = accountUtils.isVaultShardAccount(signer);
          const address = toAddress(signer.accountId, { prefix: addressPrefix });

          return (
            <Select.Item key={signer.id} value={signer.id.toString()}>
              <div className="flex w-full items-center justify-between">
                <Address
                  showIcon
                  hideAddress
                  variant="short"
                  iconSize={20}
                  address={address}
                  title={isShard ? address : signer.name}
                  canCopy={false}
                />
                <AssetBalance value={balance.toString()} asset={asset} />
              </div>
            </Select.Item>
          );
        })}
      </Select>

      <InputHint variant="error" active={hasError}>
        {errorText}
      </InputHint>
    </Field>
  );
};
