import { type ApiPromise } from '@polkadot/api';
import { BN_ZERO } from '@polkadot/util';
import { zipWith } from 'lodash';

import { type ChainId } from '@/shared/core';
import { nullable } from '@/shared/lib/utils';
import { collectiveCorePallet } from '@/shared/pallet/collectiveCore';
import { salaryPallet } from '@/shared/pallet/salary';
import { type AccountId } from '@/shared/polkadotjs-schemas';
import { createRemoteResource } from '@/shared/resource';
import { type CollectivePalletsType } from '../_lib/types';

import { type ClaimStatus, type Salaries, type SalaryCycle } from './types';

type StatusRequestParams = {
  api: ApiPromise;
  palletType: CollectivePalletsType;
  chainId: ChainId;
};

export const statusResource = createRemoteResource<StatusRequestParams, SalaryCycle | null>({
  async fn({ api, palletType }): Promise<SalaryCycle | null> {
    const status = await salaryPallet.storage.status(palletType, api);
    if (nullable(status)) return null;

    const registrationPeriod = salaryPallet.consts.registrationPeriod(palletType, api);
    const payoutPeriod = salaryPallet.consts.payoutPeriod(palletType, api);

    return {
      cycleIndex: status.cycleIndex,
      cycleStart: status.cycleStart,
      registrationPeriod,
      payoutPeriod,
      budget: status.budget,
      totalRegistrations: status.totalRegistrations,
      totalUnregisteredPaid: status.totalUnregisteredPaid,
    };
  },
});

type SalariesRequestParams = {
  api: ApiPromise;
  palletType: CollectivePalletsType;
  chainId: ChainId;
};

export const salariesResource = createRemoteResource<SalariesRequestParams, Salaries>({
  cache: {
    key: ({ palletType, chainId }) => `${palletType}:${chainId}`,
    ttl: Number.POSITIVE_INFINITY,
  },
  async fn({ api, palletType }): Promise<Salaries> {
    const params = await collectiveCorePallet.storage.params(palletType, api);

    return {
      active: params.activeSalary,
      passive: params.passiveSalary,
    };
  },
});

type ClaimantRequestParams = {
  api: ApiPromise;
  palletType: CollectivePalletsType;
  chainId: ChainId;
  accounts: AccountId[];
};

export const claimantStatusResource = createRemoteResource<ClaimantRequestParams, Record<AccountId, ClaimStatus>>({
  async fn({ api, palletType, accounts }): Promise<Record<AccountId, ClaimStatus>> {
    const claimants = await salaryPallet.storage.claimant(palletType, api, accounts);
    const mapped = zipWith(claimants, accounts, (claim, account) => ({ account, claim }));

    const res: Record<AccountId, ClaimStatus> = {};

    for (const { account, claim } of mapped) {
      if (nullable(claim)) {
        res[account] = {
          type: 'none',
          lastActive: 1,
        };
        continue;
      }

      if (claim.status.type === 'Nothing') {
        res[account] = {
          type: 'nothing',
          lastActive: claim.lastActive,
        };
        continue;
      }

      if (claim.status.type === 'Registered') {
        res[account] = {
          type: 'registered',
          amount: claim.status.data,
          lastActive: claim.lastActive,
        };
      }

      if (claim.status.type === 'Attempted') {
        res[account] = {
          type: 'payout',
          registered: claim.status.data.registered ?? BN_ZERO,
          amount: claim.status.data.amount,
          lastActive: claim.lastActive,
        };
      }
    }

    return res;
  },
});
