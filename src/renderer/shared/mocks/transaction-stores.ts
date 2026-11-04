import { type Store, combine, createStore, sample } from 'effector';

type ComplexTxStoreParams = { transaction: Store<unknown>; initiator: Store<unknown> };

export type TransactionStoresMock = ReturnType<typeof mockTransactionStores>;

/**
 * Stand-ins for the node-bound stores of `@/shared/transactions`, for tests of
 * the flow models built on them.
 *
 * `createComplexTxStore` and `createTxValidationStore` both cost a round trip
 * to a real api, and neither has anything to say about the decisions a flow
 * model makes — whether the confirm opens, whether signing is allowed. The
 * stand-ins keep the graph honest with the least machinery: the tx store passes
 * the core transaction straight through, the route is the self-route a plain
 * account gets from the real store, and the validation verdict is seeded by the
 * test — as a flag (`$valid`) or as the errors behind it (`$errors`). The rules
 * themselves live in the validators and are tested there; what a flow test
 * checks is that the flow obeys them.
 *
 * `createRouteSignerStore` asks the DI permission registry, which is empty in a
 * unit fork — every account would read as unsignable. The permission check has
 * its own tests; here the terminal hop simply signs.
 *
 * Use inside a `vi.mock` factory, with a hoisted handle to reach the stores:
 *
 * ```ts
 * const { txStores } = vi.hoisted(() => ({
 *   txStores: { current: null as TransactionStoresMock | null },
 * }));
 *
 * vi.mock('@/shared/transactions', async (importOriginal) => {
 *   const { mockTransactionStores } = await import('@/shared/mocks');
 *   txStores.current = mockTransactionStores(await importOriginal());
 *
 *   return txStores.current.module;
 * });
 * ```
 */
export const mockTransactionStores = (actual: Record<string, unknown>, { valid = true }: { valid?: boolean } = {}) => {
  // Seeded directly by a test, or implied by the errors it pushes — both are
  // the validator's verdict, so the module sees them as one flag.
  const $valid = createStore(valid);
  const $errors = createStore<unknown[]>([]);
  const $verdict = combine($valid, $errors, (ok, errors) => ok && errors.length === 0);

  const createComplexTxStore = ({ transaction, initiator }: ComplexTxStoreParams) => {
    // Writable, not derived: models down the import graph reset the stores
    // they get back from the real factory, and a derived one would refuse.
    const $tx = createStore<unknown>(null);
    sample({ clock: transaction, target: $tx });

    return {
      $route: initiator.map((account) => (account ? [account] : [])),
      $tx,
      $feeTx: createStore<unknown>(null),
      $pendingWrapping: createStore(false),
      $fee: createStore<unknown>(null),
      $pendingFee: createStore(false),
    };
  };

  /** Every bag handed out, in call order — a flow may build more than one. */
  const complexStores: ReturnType<typeof createComplexTxStore>[] = [];

  const module = {
    ...actual,
    createComplexTxStore: (params: ComplexTxStoreParams) => {
      const stores = createComplexTxStore(params);
      complexStores.push(stores);

      return stores;
    },
    createRouteSignerStore: ($route: Store<unknown[]>) => $route.map((route) => route.at(-1) ?? null),
    createTxValidationStore: () => ({
      $errors,
      $balanceValidationResults: createStore<unknown[]>([]),
      $pending: createStore(false),
      $validationDone: createStore(true),
      $valid: $verdict,
      $failed: $errors.map((errors) => errors.length > 0),
      $available: createStore<unknown[]>([]),
    }),
  };

  return { module, $valid, $errors, complexStores };
};
