import { useUnit } from 'effector-react';
import { useEffect, useMemo, useState } from 'react';

import { type PipelineIdentifier } from './createPipeline';
import { type SlotIdentifier, type SlotProps } from './createSlot';

type IsVoid<T> = T extends void ? true : false;

const useForceUpdate = () => {
  const [index, setState] = useState(0);

  return [index, () => setState((x) => (x >= Number.MAX_SAFE_INTEGER ? 0 : x + 1))] as const;
};

type SlotOptions<Props extends SlotProps> = IsVoid<Props> extends true ? { props?: void } : { props: Props };

export type UseSlotArguments<Props extends SlotProps = void> =
  IsVoid<Props> extends true
    ? [slot: SlotIdentifier<Props>, options?: SlotOptions<Props>]
    : [slot: SlotIdentifier<Props>, options: SlotOptions<Props>];

export const useSlot = <Props extends SlotProps>(...[slot, options]: UseSlotArguments<Props>) => {
  const [index, update] = useForceUpdate();
  const handlers = useUnit(slot.$handlers);
  const props = (options?.props ?? {}) as Exclude<Props, void>;

  // eslint-disable-next-line effector/no-watch
  useEffect(() => slot.updateHandlers.watch(update), []);

  return useMemo(() => slot.render(props), [handlers, index, props]);
};

export const usePipeline = <Value, Meta>(pipeline: PipelineIdentifier<Value, Meta>, value: Value, meta: Meta) => {
  const [index, update] = useForceUpdate();
  const handlers = useUnit(pipeline.$handlers);

  // eslint-disable-next-line effector/no-watch
  useEffect(() => pipeline.updateHandlers.watch(update), []);

  return useMemo(() => pipeline.apply(value, meta), [handlers, index, value, meta]);
};
