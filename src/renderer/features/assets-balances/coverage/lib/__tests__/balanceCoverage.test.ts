import { type Balance, type Chain, ChainOptions } from '@/shared/core';
import { type AnyAccount, accountService } from '@/domains/network';
import { getAccountsWithChains, getBalanceCoverage } from '../balanceCoverage';

const SUBSTRATE_A = `0x${'a'.repeat(64)}`;
const SUBSTRATE_B = `0x${'b'.repeat(64)}`;
const SUBSTRATE_C = `0x${'c'.repeat(64)}`;
const ETHEREUM = `0x${'e'.repeat(40)}`;

const record = (accountId: string): Balance => ({ accountId }) as unknown as Balance;
const chain = (chainId: string, options: ChainOptions[] = []): Chain => ({ chainId, options }) as unknown as Chain;
const walletAccount = (accountId: string): AnyAccount => ({ accountId }) as unknown as AnyAccount;

const ALL = new Set([SUBSTRATE_A, SUBSTRATE_B, SUBSTRATE_C]);

describe('getBalanceCoverage', () => {
  test('is incomplete before any balance has landed', () => {
    expect(getBalanceCoverage([], [SUBSTRATE_A], ALL)).toEqual({ complete: false, awaiting: [SUBSTRATE_A] });
  });

  test('one answered account does not stand in for the rest of the selection', () => {
    const coverage = getBalanceCoverage([record(SUBSTRATE_A)], [SUBSTRATE_A, SUBSTRATE_B, SUBSTRATE_C], ALL);

    expect(coverage).toEqual({ complete: false, awaiting: [SUBSTRATE_B, SUBSTRATE_C] });
  });

  test('is complete once every selected account has a record, zero balances included', () => {
    const balances = [record(SUBSTRATE_A), record(SUBSTRATE_B), record(SUBSTRATE_C)];

    expect(getBalanceCoverage(balances, [SUBSTRATE_A, SUBSTRATE_B, SUBSTRATE_C], ALL)).toEqual({
      complete: true,
      awaiting: [],
    });
  });

  test('does not wait for an account that fits no chain', () => {
    const coverage = getBalanceCoverage([record(SUBSTRATE_A)], [SUBSTRATE_A, SUBSTRATE_B], new Set([SUBSTRATE_A]));

    expect(coverage).toEqual({ complete: true, awaiting: [] });
  });

  test('still needs at least one record when no account fits any chain', () => {
    // Chains not loaded yet: nothing is expected, but nothing was read either —
    // this must not read as "looked, and there is nothing".
    expect(getBalanceCoverage([], [SUBSTRATE_A], new Set())).toEqual({ complete: false, awaiting: [] });
  });

  test('ignores records belonging to accounts outside the selection', () => {
    expect(getBalanceCoverage([record(SUBSTRATE_B)], [SUBSTRATE_A], ALL)).toEqual({
      complete: false,
      awaiting: [SUBSTRATE_A],
    });
  });

  test('is incomplete for an empty selection', () => {
    expect(getBalanceCoverage([record(SUBSTRATE_A)], [], ALL)).toEqual({ complete: false, awaiting: [] });
  });
});

describe('getAccountsWithChains', () => {
  const substrate = chain('substrate');
  const evm = chain('evm', [ChainOptions.ETHEREUM_BASED]);

  afterEach(() => {
    vi.restoreAllMocks();
  });

  test('matches an account without a wallet account (a contact) by address scheme', () => {
    expect(getAccountsWithChains([SUBSTRATE_A, ETHEREUM], [], [substrate])).toEqual(new Set([SUBSTRATE_A]));
    expect(getAccountsWithChains([SUBSTRATE_A, ETHEREUM], [], [evm])).toEqual(new Set([ETHEREUM]));
  });

  test('matches a wallet account by chain availability', () => {
    vi.spyOn(accountService, 'isAccountAvailableOnChain').mockImplementation(
      (account) => account.accountId === SUBSTRATE_A,
    );

    const result = getAccountsWithChains(
      [SUBSTRATE_A, SUBSTRATE_B],
      [walletAccount(SUBSTRATE_A), walletAccount(SUBSTRATE_B)],
      [substrate],
    );

    expect(result).toEqual(new Set([SUBSTRATE_A]));
  });

  test('matches nothing before chains are known', () => {
    expect(getAccountsWithChains([SUBSTRATE_A], [], [])).toEqual(new Set());
  });
});
