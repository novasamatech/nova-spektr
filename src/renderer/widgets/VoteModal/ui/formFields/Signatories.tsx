import { type BN } from '@polkadot/util';
import { useMemo } from 'react';

import { useI18n } from '@app/providers';
import { type Account, type Asset, type Chain } from '@shared/core';
import { SignatorySelector } from '@entities/operations';

type Props = {
  value: Account | null;
  signatories: { account: Account; balance: BN }[];
  hasError: boolean;
  errorText: string;
  asset: Asset;
  chain: Chain;
  onChange: (value: Account) => void;
};

export const Signatories = ({ value, asset, chain, signatories, hasError, errorText, onChange }: Props) => {
  const { t } = useI18n();
  const fixedSignatories = useMemo(
    () =>
      signatories.map(({ account, balance }) => ({
        signer: account,
        balance,
      })),
    [signatories],
  );

  return (
    <SignatorySelector
      signatory={value}
      signatories={fixedSignatories}
      asset={asset}
      addressPrefix={chain.addressPrefix}
      hasError={hasError}
      errorText={t(errorText)}
      onChange={onChange}
    />
  );
};
