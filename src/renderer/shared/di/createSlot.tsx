import { useUnit } from 'effector-react';
import { type FunctionComponent, type ReactNode, useMemo } from 'react';

import { createAbstractIdentifier } from './createAbstractIdentifier';
import { syncApplyImpl } from './syncApplyImpl';
import { type Identifier } from './types';

type SlotHandler<Props> = (props: Props) => ReactNode;
type SlotIdentifier<Props> = Identifier<Props, ReactNode[], SlotHandler<Props>> & {
  apply: (props: Props) => ReactNode;
};

export const createSlot = <Props,>(config?: { name: string }): SlotIdentifier<Props> => {
  const identifier = createAbstractIdentifier<Props, ReactNode[], SlotHandler<Props>>({
    name: config?.name ?? 'unknownSlot',
    processHandler(params) {
      return {
        fn: ({ acc, input }) => {
          // TODO add suspense and error boundary
          const c = params.fn(input);
          acc.push(c);

          return acc;
        },
      };
    },
  });

  return {
    ...identifier,
    apply: (props: Props) => syncApplyImpl({ identifier, input: props, acc: [] }),
  };
};

type IsVoid<T> = [T] extends [void] ? true : false;

export type SlotInjected<Props extends SlotProps> = {
  id: string;
  order?: number;
  fn: FunctionComponent<Props>;
  fallback?: FunctionComponent<Props>;
  error?: FunctionComponent<Props & { error: Error; retry: VoidFunction }>;
};

export type SlotProps = Record<string, unknown> | void;

type SlotOptions<Props extends SlotProps> = IsVoid<Props> extends true ? { props?: void } : { props: Props };

export type UseSlotArguments<Props extends SlotProps = void> =
  IsVoid<Props> extends true
    ? [slot: SlotIdentifier<Props>, options?: SlotOptions<Props>]
    : [slot: SlotIdentifier<Props>, options: SlotOptions<Props>];

export const useSlot = <Props extends SlotProps>(...[slot, options]: UseSlotArguments<Props>) => {
  const handlers = useUnit(slot.$handlers);
  const props = (options?.props ?? {}) as Exclude<Props, void>;

  return useMemo(() => {
    return slot.apply(props);
  }, [handlers]);
};

type SlotComponentProps<Props extends SlotProps> = { slot: SlotIdentifier<Props> } & SlotOptions<Props>;

export const Slot = <Props extends SlotProps>({ slot, ...options }: SlotComponentProps<Props>) => {
  const slots = useSlot<Props>(slot, options as SlotOptions<Props>);

  // eslint-disable-next-line react/jsx-no-useless-fragment
  return <>{slots}</>;
};
