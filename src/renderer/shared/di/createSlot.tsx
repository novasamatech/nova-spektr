import { type ComponentType, type ReactNode, memo } from 'react';

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

export type SlotIdentifier<Props> = Identifier<Props, ReactNode[], SlotHandler<Props>> & {
  render: (props: Props) => ReactNode;
};

export type SlotProps = Record<string, unknown> | void;

export const createSlot = <Props extends SlotProps>(config?: { name: string }): SlotIdentifier<Props> => {
  const identifier = createAbstractIdentifier<Props, ReactNode[], SlotHandler<Props>>({
    type: 'slot',
    name: config?.name ?? 'unknownSlot',
    processHandler(handler) {
      return {
        available: handler.available,
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

const SlotWrapper = memo<{ props: SlotProps; component: ComponentType<any> }>(
  ({ props, component: Component }) => {
    // TODO add suspense and error boundary
    return <Component {...props} />;
  },
  (a, b) => shallowEqual(a.props, b.props) && a.component === b.component,
);
