import { useUnit } from 'effector-react';
import { type ComponentType, type ReactNode, memo, useEffect, useMemo, useState } from 'react';

import { createAbstractIdentifier } from './createAbstractIdentifier';
import { shallowEqual } from './lib/shallowEqual';
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
type SlotHandler<Props> = ComponentType<Props>;

type SlotIdentifier<Props> = Identifier<Props, ReactNode[], SlotHandler<Props>> & {
  render: (props: Props) => ReactNode;
};

export const createSlot = <Props extends SlotProps>(config?: { name: string }): SlotIdentifier<Props> => {
  const identifier = createAbstractIdentifier<Props, ReactNode[], SlotHandler<Props>>({
    name: config?.name ?? 'unknownSlot',
    processHandler(handler) {
      return {
        fn: ({ acc, input: props, index }) => {
          acc.push(<SlotWrapper key={index} component={handler.fn} props={props} />);

          return acc;
        },
      };
    },
  });

  return {
    ...identifier,
    render(props: Props) {
      return syncApplyImpl({ identifier, input: props, acc: [] });
    },
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

  return useMemo(() => slot.render(props), [handlers, index, props]);
};

const SlotWrapper = memo<{ props: any; component: ComponentType<any> }>(
  ({ props, component: Component }) => {
    // TODO add suspense and error boundary
    return <Component {...props} />;
  },
  (a, b) => shallowEqual(a.props, b.props) && a.component === b.component,
);
