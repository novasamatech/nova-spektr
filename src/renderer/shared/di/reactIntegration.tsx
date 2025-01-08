import { useUnit } from 'effector-react';
import { useEffect, useMemo, useState } from 'react';

import { type PipelineIdentifier } from './createPipeline';
import { type SlotIdentifier, type SlotProps } from './createSlot';

type IsVoid<T> = T extends void | undefined ? true : false;

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

export const Slot = <Props extends SlotProps>({ id, props }: SlotOptions<Props> & { id: SlotIdentifier<Props> }) => {
  // @ts-expect-error props typing
  return <>{useSlot(id, { props })}</>;
};

export type UsePipelineArguments<Value, Meta> =
  IsVoid<Meta> extends true
    ? [pipeline: PipelineIdentifier<Value, Meta>, value: Value, meta?: Meta]
    : [pipeline: PipelineIdentifier<Value, Meta>, value: Value, meta: Meta];

export const usePipeline = <Value, Meta>(...[pipeline, value, meta]: UsePipelineArguments<Value, Meta>) => {
  const [_, update] = useForceUpdate();
  const fixedMeta = (meta ?? undefined) as Exclude<Meta, void>;

  // eslint-disable-next-line effector/no-watch
  useEffect(() => pipeline.updateHandlers.watch(update), []);

  return pipeline.apply(value, fixedMeta);
};
