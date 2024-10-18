import { useUnit } from 'effector-react';
import { type ReactNode, useMemo } from 'react';

import { createAbstractIdentifier } from './createAbstractIdentifier';
import { syncApplyImpl } from './syncApplyImpl';
import { type Identifier } from './types';

// TODO maybe it should be used instead of plain render function in handler
// export type SlotInjected<Props extends SlotProps> = {
//   id: string;
//   order?: number;
//   fn: FunctionComponent<Props>;
//   fallback?: FunctionComponent<Props>;
//   error?: FunctionComponent<Props & { error: Error; retry: VoidFunction }>;
// };

// Public interface
type SlotHandler<Props> = (props: Props) => ReactNode;

type SlotIdentifier<Props> = Identifier<Props, ReactNode[], SlotHandler<Props>> & {
  apply: (props: Props) => ReactNode;
};

export const createSlot = <Props,>(config?: { name: string }): SlotIdentifier<Props> => {
  const identifier = createAbstractIdentifier<Props, ReactNode[], SlotHandler<Props>>({
    name: config?.name ?? 'unknownSlot',
    processHandler(handler) {
      return {
        fn: ({ acc, input: props }) => {
          // TODO add suspense and error boundary
          const reactNode = handler.fn(props);
          acc.push(reactNode);

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

type IsVoid<T> = T extends void ? true : false;

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
