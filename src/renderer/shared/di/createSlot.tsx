import { useUnit } from 'effector-react';
import { Fragment, type ReactNode, useEffect, useMemo, useState } from 'react';

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

export const createSlot = <Props extends SlotProps>(config?: { name: string }): SlotIdentifier<Props> => {
  const identifier = createAbstractIdentifier<Props, ReactNode[], SlotHandler<Props>>({
    name: config?.name ?? 'unknownSlot',
    processHandler(handler) {
      return {
        fn: ({ acc, input: props, index }) => {
          // TODO add suspense and error boundary
          const reactNode = <Fragment key={index}>{handler.fn(props)}</Fragment>;
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

type SlotProps = Record<string, unknown> | void;
type SlotOptions<Props extends SlotProps> = IsVoid<Props> extends true ? { props?: void } : { props: Props };

export type UseSlotArguments<Props extends SlotProps = void> =
  IsVoid<Props> extends true
    ? [slot: SlotIdentifier<Props>, options?: SlotOptions<Props>]
    : [slot: SlotIdentifier<Props>, options: SlotOptions<Props>];

const useForceUpdate = () => {
  const [index, setState] = useState(0);

  return [index, () => setState((x) => (x >= Number.MAX_SAFE_INTEGER ? 0 : x + 1))] as const;
};

export const useSlot = <Props extends SlotProps>(...[slot, options]: UseSlotArguments<Props>) => {
  const [index, update] = useForceUpdate();
  const handlers = useUnit(slot.$handlers);
  const props = (options?.props ?? {}) as Exclude<Props, void>;

  // eslint-disable-next-line effector/no-watch
  useEffect(() => slot.updateHandlers.watch(update), []);

  return useMemo(() => slot.apply(props), [handlers, index, props]);
};
