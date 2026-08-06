import {
  type EventCallable,
  type Store,
  type Unit,
  attach,
  combine,
  createEvent,
  createStore,
  merge,
  sample,
  scopeBind,
} from 'effector';

import { nonNullable, nullable } from '@/shared/lib/utils';

import { type OperationBlockReason, type OperationStep, classifyRpcError } from './operationBlockReason';

export const OPERATION_SETTLE_DELAY = 500;
// Longer than the deep-link flow's 10s (features/multisig-operations/model/constants.ts)
// because this screen sits behind several RPC round trips: blockWeight + paymentInfo x2.
export const OPERATION_READINESS_TIMEOUT = 15_000;

type TimerHandle = ReturnType<typeof setTimeout>;

type DetachedTimerParams = {
  /** Schedules the timer, cancelling whatever the previous start scheduled. */
  start: Unit<unknown>;
  /** Drops the pending timer without scheduling a new one. */
  cancel: Unit<unknown>;
  timeout: number;
};

/**
 * A one-shot timer that never parks the Effector scope.
 *
 * Patronum's `delay`, `debounce` and `interval` all wait _inside_ an effect, so
 * that effect stays pending for the whole timeout. `allSettled` resolves only
 * once every effect in the scope has finished, so any consumer awaiting it
 * after opening the flow would block for the full 15s — the readiness timers
 * would hold every test hostage. Here the effect only schedules the timer and
 * returns immediately; the waiting happens out of band and reports back through
 * a scope-bound event.
 *
 * The handle lives in a store, not a closure variable, so concurrent `fork()`
 * scopes each cancel their own timer rather than trampling a shared one.
 */
const createDetachedTimer = ({ start, cancel, timeout }: DetachedTimerParams) => {
  const fired = createEvent();
  const scheduled = createEvent<TimerHandle>();

  const $handle = createStore<TimerHandle | null>(null, { serialize: 'ignore' }).on(scheduled, (_, handle) => handle);

  const scheduleFx = attach({
    source: $handle,
    effect: (previous) => {
      if (nonNullable(previous)) {
        clearTimeout(previous);
      }

      // `safe: true` keeps this working outside a scope too, which is how the app runs.
      scheduled(setTimeout(scopeBind(fired, { safe: true }), timeout));
    },
  });

  const cancelFx = attach({
    source: $handle,
    effect: (handle) => {
      if (nonNullable(handle)) {
        clearTimeout(handle);
      }
    },
  });

  sample({ clock: start, fn: () => undefined, target: scheduleFx });
  sample({ clock: cancel, fn: () => undefined, target: cancelFx });

  return fired;
};

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

  // Stand-ins for requirements that declare no error/blocked channel. `serialize: 'ignore'` is
  // what keeps them out of `serialize()`, which matters because stores created at one source
  // position all share a sid and a scope cannot serialize two units with the same one. Creating
  // them once rather than per requirement is a graph-size and readability choice on top.
  const $noError = createStore<Error | null>(null, { serialize: 'ignore' });
  const $noBlock = createStore<OperationBlockReason | null>(null, { serialize: 'ignore' });

  const $values = combine(requirements.map((requirement) => requirement.store));
  const $errors = combine(requirements.map((requirement) => requirement.error ?? $noError));
  const $blocks = combine(requirements.map((requirement) => requirement.blocked ?? $noBlock));

  const $settleDelayElapsed = createStore(false);
  const $timedOut = createStore(false);

  // One frozen verdict for "not on screen", returned by reference so that recomputations while
  // the flow is closed are dropped by effector's identity check instead of emitting an update.
  const firstStep = requirements.at(0)?.key;
  const inactiveReadiness: OperationReadiness = nonNullable(firstStep)
    ? { status: 'pending', step: firstStep }
    : { status: 'ready' };

  const activated = sample({ clock: active, filter: (isActive) => isActive });
  const deactivated = sample({ clock: active, filter: (isActive) => !isActive });
  const armed = merge([activated, retryRequested]);

  // Each arm cancels the clock the previous one started, so a retry issued mid-window gets a
  // full fresh deadline instead of inheriting what was left of the old one. Closing the flow
  // drops the pending timer outright, so it cannot fire into the next activation.
  const settleDelayFired = createDetachedTimer({ start: armed, cancel: deactivated, timeout: settleDelay });
  const timeoutFired = createDetachedTimer({ start: armed, cancel: deactivated, timeout });

  $settleDelayElapsed.on(settleDelayFired, () => true).reset(armed, deactivated);
  $timedOut.on(timeoutFired, () => true).reset(armed, deactivated);

  for (const requirement of requirements) {
    if (requirement.retry) {
      sample({ clock: retryRequested, target: requirement.retry });
    }
  }

  const $readiness = combine(
    {
      isActive: active,
      values: $values,
      errors: $errors,
      blocks: $blocks,
      settleDelayElapsed: $settleDelayElapsed,
      timedOut: $timedOut,
      timeoutReason,
    },
    ({ isActive, values, errors, blocks, settleDelayElapsed, timedOut, timeoutReason }): OperationReadiness => {
      // Off screen there is no verdict to publish. Requests started while the flow was open stay
      // in flight after it closes — a rejection lands on `error`, and the timeout fires ~15s
      // later — and without this guard each would surface as a failure nobody can see or retry.
      if (!isActive) {
        return inactiveReadiness;
      }

      // Tier 1 — deterministic. Withheld until the settle delay elapses because some of these
      // stores are momentarily empty on flow start, before their pre-select samples fire.
      if (settleDelayElapsed) {
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
