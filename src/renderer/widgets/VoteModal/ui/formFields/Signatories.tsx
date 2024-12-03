import { BN_ZERO } from '@polkadot/util';
import { useMemo } from 'react';

import { type Account, type Asset, type Balance, type Chain } from '@/shared/core';
import { useI18n } from '@/shared/i18n';
import { locksService } from '@/entities/governance';
import { SignatorySelector } from '@/entities/operations';

type Props = {
  value: Account | null;
  signatories: { account: Account; balance: Balance | null }[];
  hasError: boolean;
  errorText: string;
  asset: Asset;
  chain: Chain;
  onChange: (value: Account) => void;
};

export const Signatories = ({ value, asset, chain, signatories, hasError, errorText, onChange }: Props) => {
  const { t } = useI18n();

  const fixedSignatories = useMemo(() => {
    return signatories.map(({ account, balance }) => {
      const availableBalance = balance ? locksService.getAvailableBalance(balance) : BN_ZERO;

      return {
        signer: account,
        balance: availableBalance,
      };
    });
  }, [signatories]);

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
