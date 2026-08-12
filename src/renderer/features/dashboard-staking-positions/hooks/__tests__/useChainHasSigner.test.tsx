import { renderHook } from '@testing-library/react';
import { type Scope, fork } from 'effector';
import { Provider } from 'effector-react';
import { type PropsWithChildren } from 'react';
import { beforeAll, describe, expect, it } from 'vitest';

import { type Chain, type ChainId, SigningType } from '@/shared/core';
import { type AccountId } from '@/shared/polkadotjs-schemas';
import { type AnyAccount, accountService, accounts } from '@/domains/network';
import { useChainHasSigner } from '../useChainHasSigner';

const accountId = (n: number): AccountId => `0x${n.toString(16).padStart(64, '0')}` as AccountId;
const chainId = (n: number): ChainId => `0x${n.toString(16).padStart(64, '0')}` as ChainId;

const chain = (n: number): Chain => ({ chainId: chainId(n), name: `chain-${n}` }) as unknown as Chain;

const chainAccount = (n: number, chainIndex: number, signingType = SigningType.POLKADOT_VAULT): AnyAccount =>
  ({
    accountId: accountId(n),
    walletId: n,
    name: `account-${n}`,
    type: 'chain',
    chainId: chainId(chainIndex),
    signingType,
  }) as unknown as AnyAccount;

/**
 * `isAccountAvailableOnChain` answers through a DI `anyOf` that reads its
 * handlers with `getState()`. Called from a React render there is no active
 * effector computation, so a handler registered inside a fork's scope is
 * invisible — the hook sees the _global_ handler list, exactly as it does in
 * the app where features register at startup. So the stand-in handler is
 * registered globally, once, and only the accounts list is fork-seeded.
 */
beforeAll(() => {
  accountService.accountAvailabilityOnChainAnyOf.registerHandler({
    body: ({ account, chain }) => (accountService.isChainAccount(account) ? account.chainId === chain.chainId : true),
    available: () => true,
  });
});

function forkWithAccounts(list: AnyAccount[]): Scope {
  return fork({ values: [[accounts.__test.$list, list]] });
}

const renderChainHasSigner = (scope: Scope, target: Chain | null) => {
  const wrapper = ({ children }: PropsWithChildren) => <Provider value={scope}>{children}</Provider>;

  return renderHook(() => useChainHasSigner(target), { wrapper });
};

describe('features/dashboard-staking-positions/hooks/useChainHasSigner', () => {
  it('finds a signer that is not the position’s own account', async () => {
    // The whole point of the predicate: a contact position stays claimable as
    // long as ANY account of ours can sign on the chain.
    const scope = forkWithAccounts([chainAccount(1, 1)]);

    const { result } = renderChainHasSigner(scope, chain(1));

    expect(result.current).toBe(true);
  });

  it('refuses a chain where every account is watch-only', async () => {
    const scope = forkWithAccounts([
      chainAccount(1, 1, SigningType.WATCH_ONLY),
      chainAccount(2, 1, SigningType.WATCH_ONLY),
    ]);

    const { result } = renderChainHasSigner(scope, chain(1));

    expect(result.current).toBe(false);
  });

  it('refuses a chain the only signer is not available on', async () => {
    const scope = forkWithAccounts([chainAccount(1, 2)]);

    const { result } = renderChainHasSigner(scope, chain(1));

    expect(result.current).toBe(false);
  });

  it('answers false while there is no chain to ask about', async () => {
    const scope = forkWithAccounts([chainAccount(1, 1)]);

    const { result } = renderChainHasSigner(scope, null);

    expect(result.current).toBe(false);
  });
});
