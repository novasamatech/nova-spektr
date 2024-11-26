import { type BN } from '@polkadot/util';

import { type Account, type Asset, type ID } from '@/shared/core';
import { useI18n } from '@/shared/i18n';
import { toAddress } from '@/shared/lib/utils';
import { InputHint } from '@/shared/ui';
import { Address } from '@/shared/ui-entities';
import { Field, Select } from '@/shared/ui-kit';
import { AssetBalance } from '@/entities/asset';
import { accountUtils } from '@/entities/wallet';

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

  const selectSigner = (signerId: ID) => {
    const selectedSigner = signatories.find(({ signer }) => signer.id === signerId);
    if (!selectedSigner) return;

    onChange(selectedSigner.signer);
  };

  return (
    <div className="flex flex-col gap-y-2">
      <Field text={t('proxy.addProxy.signatoryLabel')}>
        <Select
          placeholder={t('proxy.addProxy.signatoryPlaceholder')}
          value={signatory?.id.toString() ?? null}
          invalid={hasError}
          onChange={(value) => selectSigner(Number(value))}
        >
          {signatories.map(({ signer, balance }) => {
            const isShard = accountUtils.isShardAccount(signer);
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
      </Field>
      <InputHint variant="error" active={hasError}>
        {errorText}
      </InputHint>
    </div>
  );
};
