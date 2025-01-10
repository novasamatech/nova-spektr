import { type Store, combine, createEvent, restore as effectorRestore } from 'effector';

import { nonNullable, nullable } from '@/shared/lib/utils';

import { createComplexFlag } from './createComplexFlag';

type ErrorType = 'fatal' | 'error' | 'warning';
type FailedStateParams = { error: Error; type: ErrorType };
type IdleState = { status: 'idle' };
type StartingState = { status: 'starting' };
export type RunningState<T> = { status: 'running'; data: T };
type FailedState<T> = { status: 'failed'; data: T | null } & FailedStateParams;
type State<T> = IdleState | StartingState | RunningState<T> | FailedState<T>;

export type StatusParams<Input, Reasons extends string> = {
  name?: string;
  reasons: Reasons[];
  enable: Store<boolean>;
  input: Store<Input | null>;
  filter?: (input: NoInfer<Input>) => IdleState | Omit<FailedState<Input>, 'data'> | null;
};

export const createStatus = <Input, const Reasons extends string>({
  name = 'unknown status',
  reasons,
  input,
  enable,
  filter,
}: StatusParams<Input, Reasons>) => {
  const { $flag, enable: start, disable: stop } = createComplexFlag({ reasons });

  const fail = createEvent<FailedStateParams>({ name: `${name}/fail` });
  const restore = createEvent({ name: `${name}/restore` });
  const $failed = effectorRestore(fail, null).reset(restore);

  const $state = combine(
    { flag: $flag, enable, data: input, failed: $failed },
    ({ flag, enable, data, failed }): State<Input> => {
      if (!enable) {
        return { status: 'idle' };
      }

      if (nonNullable(failed)) {
        return { status: 'failed', data, type: failed.type, error: failed.error };
      }

      if (!flag) {
        return { status: 'idle' };
      }

      if (nullable(data)) {
        return { status: 'starting' };
      }

      if (filter) {
        const filterResult = filter(data);
        if (filterResult === null) {
          return { status: 'running', data };
        }
        if (filterResult.status === 'idle') {
          return filterResult;
        }
        if (filterResult.status === 'failed') {
          return { status: 'failed', data, error: filterResult.error, type: filterResult.type };
        }
      }

      return { status: 'running', data };
    },
  );

  $state.compositeName = {
    shortName: 'state',
    fullName: `${name}/state`,
    path: [name, 'state'],
  };

  return {
    $state,
    $failed,
    fail,
    restore,
    start,
    stop,
  };
};
