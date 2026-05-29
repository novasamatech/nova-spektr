import { describe, expect, it } from 'vitest';

import { AccountType } from '@/shared/core';
import { type AccountId } from '@/shared/polkadotjs-schemas';
import { type AnyAccount } from '@/domains/network';

import { findRouteMultisigAccountId } from './findRouteMultisigAccountId';

const id = (n: number): AccountId => `0x${n.toString(16).padStart(64, '0')}` as AccountId;

const watchOnly = (accountId: AccountId) => ({ accountType: AccountType.WATCH_ONLY, accountId }) as unknown as AnyAccount;
const proxied = (accountId: AccountId) => ({ accountType: AccountType.PROXIED, accountId }) as unknown as AnyAccount;
const regularMultisig = (accountId: AccountId) => ({ accountType: AccountType.MULTISIG, accountId }) as unknown as AnyAccount;
const flexibleMultisig = (accountId: AccountId, multisigAccountId: AccountId) =>
  ({ accountType: AccountType.FLEX_MULTISIG, accountId, multisigAccountId }) as unknown as AnyAccount;

describe('findRouteMultisigAccountId', () => {
  it('returns null for an empty route', () => {
    expect(findRouteMultisigAccountId([])).toBeNull();
  });

  it('returns null for a route with no multisig', () => {
    expect(findRouteMultisigAccountId([watchOnly(id(1))])).toBeNull();
  });

  it('returns the accountId of a regular multisig signed directly (multisig → signer)', () => {
    expect(findRouteMultisigAccountId([regularMultisig(id(2)), watchOnly(id(1))])).toBe(id(2));
  });

  it('finds the multisig even when reached via a proxy (proxied → multisig → signer)', () => {
    expect(findRouteMultisigAccountId([proxied(id(9)), regularMultisig(id(2)), watchOnly(id(1))])).toBe(id(2));
  });

  it('returns the inner multisigAccountId for a flexible multisig', () => {
    expect(findRouteMultisigAccountId([flexibleMultisig(id(5), id(7)), watchOnly(id(1))])).toBe(id(7));
  });
});
