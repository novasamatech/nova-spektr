import { BN_ZERO } from '@polkadot/util';
import { default as BigNumber } from 'bignumber.js';
import { useUnit } from 'effector-react';
import { useMemo } from 'react';

import { type VotingMap } from '@/shared/core';
import { getRoundedValue } from '@/shared/lib/utils';
import { useAssetsPrices } from '@/domains/price';
import { votingService } from '@/entities/governance';
import { currencySelect } from '@/aggregates/currency-select';

import { type ChainGovernanceSummary } from './useGovernanceOverview';

export type GovernanceBreakdownRow = {
  accountId: string;
  name: string;
  address: string;
  rawAmount: string;
  rawAmountNum: number;
  fiatValue: string;
  fiatValueNum: number;
  sharePercent: number;
  averageConviction: number;
  precision: number;
  symbol: string;
  colorIndex: number;
};

export type EntryLike = { accountId: string; name: string; address: string };

type Params = {
  votingMap: VotingMap;
  chainSummary: ChainGovernanceSummary;
  accountIds: string[];
  allEntries: EntryLike[];
};

export const useGovernanceBreakdown = ({ votingMap, chainSummary, accountIds, allEntries }: Params) => {
  const currency = useUnit(currencySelect.$activeCurrency);
  const pricesParams = useUnit(currencySelect.$currentPricesParams);
  const { data: prices } = useAssetsPrices(pricesParams);

  return useMemo(() => {
    if (!prices || !currency) return { rows: [] };

    const entryMap = new Map<string, { name: string; address: string }>();
    for (const entry of allEntries) {
      entryMap.set(entry.accountId, { name: entry.name, address: entry.address });
    }

    const priceItem = prices[chainSummary.priceId]?.[currency.coingeckoId];
    const accountIdSet = new Set(accountIds);

    const rawRows: GovernanceBreakdownRow[] = [];
    let totalFiat = new BigNumber(0);

    for (const [accountId, trackVoting] of Object.entries(votingMap)) {
      if (!accountIdSet.has(accountId)) continue;

      let maxLock = BN_ZERO;
      let totalWeight = new BigNumber(0);
      let weightedConvictionSum = new BigNumber(0);

      for (const voting of Object.values(trackVoting)) {
        if (votingService.isCasting(voting)) {
          for (const vote of Object.values(voting.votes)) {
            const amount = votingService.calculateAccountVoteAmount(vote);
            if (amount.gt(maxLock)) {
              maxLock = amount;
            }
            const conviction = votingService.getAccountVoteConviction(vote);
            const multiplier = votingService.getConvictionMultiplier(conviction);
            const weight = new BigNumber(amount.toString());
            totalWeight = totalWeight.plus(weight);
            weightedConvictionSum = weightedConvictionSum.plus(weight.times(multiplier));
          }
          if (voting.prior?.amount && voting.prior.amount.gt(maxLock)) {
            maxLock = voting.prior.amount;
          }
        } else if (votingService.isDelegating(voting)) {
          if (voting.balance.gt(maxLock)) {
            maxLock = voting.balance;
          }
          const multiplier = votingService.getConvictionMultiplier(voting.conviction);
          const weight = new BigNumber(voting.balance.toString());
          totalWeight = totalWeight.plus(weight);
          weightedConvictionSum = weightedConvictionSum.plus(weight.times(multiplier));
          if (voting.prior?.amount && voting.prior.amount.gt(maxLock)) {
            maxLock = voting.prior.amount;
          }
        }
      }

      if (maxLock.isZero()) continue;

      const averageConviction = totalWeight.gt(0) ? weightedConvictionSum.div(totalWeight).toNumber() : 0;

      const fiat = priceItem
        ? new BigNumber(getRoundedValue(maxLock.toString(), priceItem.price, chainSummary.precision))
        : new BigNumber(0);

      totalFiat = totalFiat.plus(fiat);

      const entry = entryMap.get(accountId);
      rawRows.push({
        accountId,
        name: entry?.name ?? '',
        address: entry?.address ?? '',
        rawAmount: maxLock.toString(),
        rawAmountNum: new BigNumber(maxLock.toString()).toNumber(),
        fiatValue: fiat.toString(),
        fiatValueNum: fiat.toNumber(),
        sharePercent: 0,
        averageConviction,
        precision: chainSummary.precision,
        symbol: chainSummary.symbol,
        colorIndex: 0,
      });
    }

    rawRows.sort((a, b) => b.fiatValueNum - a.fiatValueNum);

    for (let i = 0; i < rawRows.length; i++) {
      const row = rawRows[i]!;
      row.colorIndex = i;
      row.sharePercent = totalFiat.gt(0)
        ? Math.round(new BigNumber(row.fiatValue).div(totalFiat).times(1000).toNumber()) / 10
        : 0;
    }

    return { rows: rawRows };
  }, [votingMap, chainSummary, accountIds, allEntries, prices, currency]);
};
