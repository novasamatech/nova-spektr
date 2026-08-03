import { type ApiPromise } from '@polkadot/api';
import { z } from 'zod';

import { toAddress } from '@/shared/lib/utils';
import { type StakingRewardDestination, stakingPallet } from '@/shared/pallet/staking';
import { type AccountId, pjsSchema } from '@/shared/polkadotjs-schemas';
import { type Payee } from '../types';

import { type NominationsMap, type PayeeMap } from './types';

const { stakingNominations, stakingRewardDestination } = stakingPallet.schema;

const nominationsSchema = pjsSchema.vec(pjsSchema.optional(stakingNominations));

/**
 * `payee` is `OptionQuery` on recent runtimes and `ValueQuery` on older ones.
 */
const payeeSchema = pjsSchema.vec(z.union([pjsSchema.optional(stakingRewardDestination), stakingRewardDestination]));

const minBondSchema = pjsSchema.u128;

function mapPayee(destination: StakingRewardDestination | null, addressPrefix?: number): Payee | null {
  if (destination === null) return null;

  switch (destination.type) {
    case 'Account':
      return { Account: toAddress(destination.data, { prefix: addressPrefix }) };
    case 'None':
      return null;
    default:
      return destination.type;
  }
}

function buildNominationsMap(stashes: AccountId[], values: unknown): NominationsMap {
  const parsed = nominationsSchema.parse(values);

  return stashes.reduce<NominationsMap>((acc, stash, index) => {
    const nomination = parsed[index] ?? null;

    acc[stash] = nomination ? { targets: nomination.targets, submittedIn: nomination.submittedIn } : null;

    return acc;
  }, {});
}

function buildPayeeMap(stashes: AccountId[], values: unknown, addressPrefix?: number): PayeeMap {
  const parsed = payeeSchema.parse(values);

  return stashes.reduce<PayeeMap>((acc, stash, index) => {
    acc[stash] = mapPayee(parsed[index] ?? null, addressPrefix);

    return acc;
  }, {});
}

function subscribeNominations(
  api: ApiPromise,
  stashes: AccountId[],
  callback: (nominations: NominationsMap) => void,
): Promise<() => void> {
  return api.query.staking.nominators.multi(stashes, values => {
    try {
      callback(buildNominationsMap(stashes, values));
    } catch (error) {
      console.warn(error);
      callback({});
    }
  });
}

function subscribePayee(
  api: ApiPromise,
  stashes: AccountId[],
  callback: (payee: PayeeMap) => void,
  addressPrefix?: number,
): Promise<() => void> {
  return api.query.staking.payee.multi(stashes, values => {
    try {
      callback(buildPayeeMap(stashes, values, addressPrefix));
    } catch (error) {
      console.warn(error);
      callback({});
    }
  });
}

function subscribeMinNominatorBond(api: ApiPromise, callback: (minBond: string) => void): Promise<() => void> {
  return api.query.staking.minNominatorBond(value => {
    try {
      callback(minBondSchema.parse(value).toString());
    } catch (error) {
      console.warn(error);
      callback('0');
    }
  });
}

export const nominationsService = {
  buildNominationsMap,
  buildPayeeMap,
  mapPayee,
  subscribeMinNominatorBond,
  subscribeNominations,
  subscribePayee,
};
