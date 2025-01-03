import { isFunction, isNumber } from 'lodash';
import { type ComponentType, type FunctionComponent, type ReactNode, memo } from 'react';

import { createAbstractIdentifier } from './createAbstractIdentifier';
import { isIdentifier } from './helpers';
import { shallowEqual } from './lib/shallowEqual';
import { type Identifier } from './types';

// Public interface
type SlotHandler<Props> = FunctionComponent<Props> | SlotHandlerExtended<Props>;

type SlotHandlerExtended<Props> = {
  order?: number;
  render: FunctionComponent<Props>;
};

export type SlotIdentifier<Props> = Identifier<Props, ReactNode[], SlotHandler<Props>, SlotHandlerExtended<Props>> & {
  render: (props: Props) => ReactNode[];
};

export type SlotProps = Record<string, unknown> | void;

export const isSlotIdentifier = (v: unknown): v is SlotIdentifier<any> => isIdentifier(v) && v.type === 'slot';

export const normalizeSlotHandler = <Props,>(body: SlotHandler<Props>): SlotHandlerExtended<Props> => {
  return isFunction(body) ? { render: body } : body;
};

export const createSlot = <Props extends SlotProps = void>(config?: { name: string }): SlotIdentifier<Props> => {
  const identifier = createAbstractIdentifier<Props, ReactNode[], SlotHandler<Props>, SlotHandlerExtended<Props>>({
    type: 'slot',
    name: config?.name ?? 'unknownSlot',
    processHandler: (handler) => {
      return {
        available: handler.available,
        body: normalizeSlotHandler(handler.body),
      };
    },
  });

  return {
    ...identifier,
    render(props: Props) {
      // Implementation is similar to syncApplyImpl but have additional login inside for loop,
      //   so it's better to keep it separated

      // eslint-disable-next-line effector/no-getState
      const handlers = identifier.$handlers.getState();
      const result: ReactNode[] = [];
      const order = new Map<ReactNode, number>();
      let shouldReorder = false;

      for (let index = 0; index < handlers.length; index++) {
        const handler = handlers[index];
        if (!handler) {
          continue;
        }

        try {
          if (handler.available()) {
            const node = <SlotWrapper key={index} component={handler.body.render} props={props} />;
            result.push(node);
            order.set(node, handler.body.order ?? index);

            if (isNumber(handler.body.order)) {
              shouldReorder = true;
            }
          }
        } catch (error) {
          // TODO handle error
          console.error(error);

          // Skip handler and move on
          continue;
        }
      }

      if (shouldReorder) {
        return result.sort((a, b) => (order.get(a) ?? 0) - (order.get(b) ?? 0));
      }

      return result;
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
