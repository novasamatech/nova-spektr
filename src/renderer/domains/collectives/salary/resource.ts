import { BN_ZERO } from '@polkadot/util';

import { type ChainId } from '@/shared/core';
import { nullable } from '@/shared/lib/utils';
import { collectiveCorePallet } from '@/shared/pallet/collectiveCore';
import { salaryPallet } from '@/shared/pallet/salary';
import { type AccountId } from '@/shared/polkadotjs-schemas';
import { createRemoteResource } from '@/shared/resource';
import { getChainRegistry } from '@/domains/network';
import { type CollectivePalletsType } from '../_lib/types';

import { type ClaimStatus, type Salaries, type SalaryCycle } from './types';

type StatusRequestParams = {
  chainId: ChainId;
  palletType: CollectivePalletsType;
};

export const statusResource = createRemoteResource<StatusRequestParams, SalaryCycle | null>({
  async fn({ chainId, palletType }): Promise<SalaryCycle | null> {
    const papi = getChainRegistry().getApi(chainId);

    const status = await salaryPallet.storage.status(palletType, papi);
    if (nullable(status)) return null;

    const registrationPeriod = salaryPallet.consts.registrationPeriod(palletType, papi);
    const payoutPeriod = salaryPallet.consts.payoutPeriod(palletType, papi);

    return {
      cycleIndex: status.cycle_index,
      cycleStart: status.cycle_start,
      registrationPeriod,
      payoutPeriod,
      budget: status.budget,
      totalRegistrations: status.total_registrations,
      totalUnregisteredPaid: status.total_unregisteredPaid,
    };
  },
});

type SalariesRequestParams = {
  palletType: CollectivePalletsType;
  chainId: ChainId;
};

export const salariesResource = createRemoteResource<SalariesRequestParams, Salaries>({
  cache: {
    key: ({ palletType, chainId }) => `${palletType}:${chainId}`,
    ttl: Number.POSITIVE_INFINITY,
  },
  async fn({ chainId, palletType }): Promise<Salaries> {
    const papi = getChainRegistry().getApi(chainId);
    const params = await collectiveCorePallet.storage.params(palletType, papi);

    return {
      active: params.active_salary,
      passive: params.passive_salary,
    };
  },
});

type ClaimantRequestParams = {
  palletType: CollectivePalletsType;
  chainId: ChainId;
  accounts: AccountId[];
};

export const claimantStatusResource = createRemoteResource<ClaimantRequestParams, Record<AccountId, ClaimStatus>>({
  async fn({ chainId, palletType, accounts }): Promise<Record<AccountId, ClaimStatus>> {
    const papi = getChainRegistry().getApi(chainId);
    const claimants = await salaryPallet.storage.claimant(palletType, papi, accounts);

    const res: Record<AccountId, ClaimStatus> = {};

    for (const { account, claim } of claimants) {
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
          lastActive: claim.last_active,
        };
        continue;
      }

      if (claim.status.type === 'Registered') {
        res[account] = {
          type: 'registered',
          amount: claim.status.data,
          lastActive: claim.last_active,
        };
      }

      if (claim.status.type === 'Attempted') {
        res[account] = {
          type: 'payout',
          registered: claim.status.data.registered ?? BN_ZERO,
          amount: claim.status.data.amount,
          lastActive: claim.last_active,
        };
      }
    }

    return res;
  },
});
