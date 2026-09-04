import { useUnit } from 'effector-react';
import { useCallback, useMemo } from 'react';

import { getRoundedValue } from '@/shared/lib/utils';
import { useAssetsPrices } from '@/domains/price';
import { networkModel } from '@/entities/network';
import { walletModel } from '@/entities/wallet';
import { currencySelect } from '@/aggregates/currency-select';
import { walletSelect } from '@/aggregates/wallet-select';
import { type GovernanceLockRow, type ToFiat, buildLockRows, compareLockRows } from '../lib/buildLockRows';
import { KUSAMA_AH_CHAIN_ID, POLKADOT_AH_CHAIN_ID } from '../lib/constants';
import { type FreshClaim, deriveFreshClaim } from '../lib/deriveFreshClaim';

import { useChainGovernanceData } from './useChainGovernanceData';

export type { GovernanceLockRow } from '../lib/buildLockRows';
export type { FreshClaim } from '../lib/deriveFreshClaim';

/**
 * The Locks widget's data: one row per account x chain across both Asset Hubs,
 * sorted claimable-first, plus the click-time re-derivation the Unlock button
 * needs.
 *
 * Both chains are read here rather than in the widget so the rows arrive as one
 * sorted list — the biggest claim on top wherever it lives. `getFreshClaim`
 * hands back the release for one row measured against the live head, because
 * the rows themselves are drawn from a periodic block snapshot.
 */
export const useGovernanceLocks = (accountIds: string[]) => {
  const fiatFlag = useUnit(currencySelect.$fiatFlag);
  const currency = useUnit(currencySelect.$activeCurrency);
  const pricesParams = useUnit(currencySelect.$currentPricesParams);
  const { data: prices } = useAssetsPrices(pricesParams);
  const chains = useUnit(networkModel.$chains);
  const allAccounts = useUnit(walletModel.$availableAccounts);
  const wallets = useUnit(walletModel.$wallets);
  const selectedWalletId = useUnit(walletSelect.$selectedWalletId);

  const polkadot = useChainGovernanceData(POLKADOT_AH_CHAIN_ID, accountIds);
  const kusama = useChainGovernanceData(KUSAMA_AH_CHAIN_ID, accountIds);

  const rows = useMemo(() => {
    const toFiat: ToFiat | null =
      fiatFlag && prices && currency
        ? (amount, precision, priceId) => {
            const price = prices[priceId]?.[currency.coingeckoId];
            return price ? getRoundedValue(amount, price.price, precision) : null;
          }
        : null;
    const now = Date.now();
    const shared = { allAccounts, wallets, toFiat, now, preferredWalletId: selectedWalletId };

    return [
      ...buildLockRows({ data: polkadot, chain: chains[POLKADOT_AH_CHAIN_ID], ...shared }),
      ...buildLockRows({ data: kusama, chain: chains[KUSAMA_AH_CHAIN_ID], ...shared }),
    ].sort(compareLockRows);
  }, [polkadot, kusama, chains, allAccounts, wallets, selectedWalletId, fiatFlag, prices, currency]);

  const getFreshClaim = useCallback(
    (row: GovernanceLockRow): FreshClaim =>
      deriveFreshClaim({
        row,
        live: row.chainId === POLKADOT_AH_CHAIN_ID ? polkadot : kusama,
        allAccounts,
        preferredWalletId: selectedWalletId,
      }),
    [polkadot, kusama, allAccounts, selectedWalletId],
  );

  const pending =
    accountIds.length > 0 &&
    ((polkadot === null && kusama === null) || (polkadot?.pending ?? false) || (kusama?.pending ?? false));

  return { rows, pending, fiatFlag: Boolean(fiatFlag), currency, getFreshClaim };
};
