import { type EventCallable, type Store, combine, createEvent, createStore, merge, sample } from 'effector';
import { debounce } from 'patronum';

import { nonNullable, nullable } from '@/shared/lib/utils';

import { type OperationBlockReason, type OperationStep, classifyRpcError } from './operationBlockReason';

export const OPERATION_SETTLE_DELAY = 500;
// Longer than the deep-link flow's 10s (features/multisig-operations/model/constants.ts)
// because this screen sits behind several RPC round trips: blockWeight + paymentInfo x2.
export const OPERATION_READINESS_TIMEOUT = 15_000;

export type OperationReadiness =
  | { status: 'ready' }
  | { status: 'pending'; step: OperationStep }
  | { status: 'blocked'; reason: OperationBlockReason };

export type OperationRequirement = {
  /** Also the step name reported while this requirement is unsatisfied. */
  key: OperationStep;
  /** Satisfied when non-null. */
  store: Store<unknown>;
  /** Tier 2: an actual rejection from this step. */
  error?: Store<Error | null>;
  /** Tier 1: a deterministic block known without waiting. */
  blocked?: Store<OperationBlockReason | null>;
  /** Re-run this step when the user retries. */
  retry?: EventCallable<void>;
};

type Params = {
  /** The flow is on the screen this readiness belongs to. */
  active: Store<boolean>;
  requirements: OperationRequirement[];
  /**
   * Verdict used when the timeout fires; the consumer derives it from
   * connection status.
   */
  timeoutReason: Store<OperationBlockReason>;
  settleDelay?: number;
  timeout?: number;
};

export const createOperationReadiness = ({
  active,
  requirements,
  timeoutReason,
  settleDelay = OPERATION_SETTLE_DELAY,
  timeout = OPERATION_READINESS_TIMEOUT,
}: Params) => {
  const retryRequested = createEvent();

  // Stand-ins for requirements that declare no error/blocked channel. They are created once
  // rather than per requirement because stores created at one source position all share a sid,
  // and `serialize` rejects a scope holding two units with the same sid. `serialize: 'ignore'`
  // covers the remaining case of several factory instances living in the same app.
  const $noError = createStore<Error | null>(null, { serialize: 'ignore' });
  const $noBlock = createStore<OperationBlockReason | null>(null, { serialize: 'ignore' });

  const $values = combine(requirements.map((requirement) => requirement.store));
  const $errors = combine(requirements.map((requirement) => requirement.error ?? $noError));
  const $blocks = combine(requirements.map((requirement) => requirement.blocked ?? $noBlock));

  const $settled = createStore(false);
  const $timedOut = createStore(false);

  const activated = sample({ clock: active, filter: (isActive) => isActive });
  const deactivated = sample({ clock: active, filter: (isActive) => !isActive });
  const armed = merge([activated, retryRequested]);

  // `debounce`, not `delay`: every arm must cancel the clock started by the previous one.
  // With `delay` a retry issued mid-window leaves the original timer running, so the retried
  // attempt inherits whatever was left of the first deadline and can be declared timed out
  // seconds after it started. `debounce` clears the pending timeout before starting the new
  // one, and it keeps the canceller in a store, so it stays correct under `fork`.
  $settled.on(debounce(armed, settleDelay), () => true).reset(armed, deactivated);
  $timedOut.on(debounce(armed, timeout), () => true).reset(armed, deactivated);

  for (const requirement of requirements) {
    if (requirement.retry) {
      sample({ clock: retryRequested, target: requirement.retry });
    }
  }

  const $readiness = combine(
    {
      values: $values,
      errors: $errors,
      blocks: $blocks,
      settled: $settled,
      timedOut: $timedOut,
      timeoutReason,
    },
    ({ values, errors, blocks, settled, timedOut, timeoutReason }): OperationReadiness => {
      // Tier 1 — deterministic, but only once the stores have had a tick to settle.
      if (settled) {
        for (const block of blocks) {
          if (nonNullable(block)) {
            return { status: 'blocked', reason: block };
          }
        }
      }

      // Tier 2 — an actual rejection is definitive, no settle delay needed.
      for (const [index, error] of errors.entries()) {
        if (nonNullable(error)) {
          return { status: 'blocked', reason: classifyRpcError(error, requirements[index]!.key) };
        }
      }

      const pendingIndex = values.findIndex((value) => nullable(value));
      if (pendingIndex === -1) {
        return { status: 'ready' };
      }

      // Tier 3 — backstop for anything that never rejects at all.
      if (timedOut) {
        return { status: 'blocked', reason: timeoutReason };
      }

      return { status: 'pending', step: requirements[pendingIndex]!.key };
    },
  );

  return { $readiness, retryRequested };
};
