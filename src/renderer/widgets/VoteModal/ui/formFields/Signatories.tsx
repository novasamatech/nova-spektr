import { BN_ZERO } from '@polkadot/util';
import { memo, useMemo } from 'react';

import { type Account, type Asset, type Balance, type Chain } from '@/shared/core';
import { useI18n } from '@/shared/i18n';
import { type AnyAccount } from '@/domains/network';
import { balanceUtils } from '@/entities/balance';
import { locksService } from '@/entities/governance';
import { SignatorySelector } from '@/entities/operations';

type Props = {
  value: AnyAccount | null;
  signatories: AnyAccount[];
  balances: Balance[];
  hasError: boolean;
  errorText: string;
  asset: Asset;
  chain: Chain;
  onChange: (value: Account) => void;
};

export const Signatories = memo(
  ({ value, asset, chain, balances, signatories, hasError, errorText, onChange }: Props) => {
    const { t } = useI18n();

    const fixedSignatories = useMemo(() => {
      return signatories.map((account) => {
        const balance = balanceUtils.getBalance(balances, account.accountId, chain.chainId, asset.assetId.toString());
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
  },
);
