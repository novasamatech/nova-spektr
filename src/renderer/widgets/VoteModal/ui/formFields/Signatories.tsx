import { BN_ZERO } from '@polkadot/util';
import { memo, useMemo } from 'react';

import { type Asset, type BalanceMap, type Chain, type Wallet } from '@/shared/core';
import { useI18n } from '@/shared/i18n';
import { SignatorySelect } from '@/shared/ui-entities';
import { type AnyAccount } from '@/domains/network';
import { balanceUtils } from '@/entities/balance';
import { locksService } from '@/entities/governance';

type Props = {
  value: AnyAccount | null;
  signatories: AnyAccount[];
  initiator: AnyAccount | null;
  allAccounts: AnyAccount[];
  allWallets: Wallet[];
  balances: BalanceMap;
  hasError: boolean;
  errorText: string;
  asset: Asset;
  chain: Chain;
  onChange: (value: AnyAccount) => void;
};

export const Signatories = memo(
  ({
    value,
    asset,
    chain,
    balances,
    signatories,
    hasError,
    errorText,
    onChange,
    allAccounts,
    allWallets,
    initiator,
  }: Props) => {
    const { t } = useI18n();

    const fixedSignatories = useMemo(() => {
      return signatories.map((account) => {
        const balance = balanceUtils.getBalance(balances, account.accountId, chain.chainId, asset.assetId);
        const availableBalance = balance ? locksService.getAvailableBalance(balance).toString() : BN_ZERO.toString();

        return {
          account: account,
          balance: availableBalance,
        };
      });
    }, [signatories]);

    return (
      <SignatorySelect
        network={{
          chain,
          asset,
        }}
        signatory={value}
        allAccounts={allAccounts}
        allWallets={allWallets}
        initiator={initiator}
        signatories={fixedSignatories}
        hasError={hasError}
        errorText={t(errorText)}
        onChange={onChange}
      />
    );
  },
);
