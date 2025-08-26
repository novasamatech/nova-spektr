import { useUnit } from 'effector-react';
import { type ReactNode, useEffect, useMemo, useState } from 'react';

import { type AnyOfIdentifier } from './createAnyOf';
import { type PipelineIdentifier } from './createPipeline';
import { type SlotIdentifier, type SlotProps } from './createSlot';
import { type TransformerIdentifier } from './createTransformer';

type IsVoid<T> = T extends void | undefined ? true : false;

const useForceUpdate = () => {
  const [index, setState] = useState(0);

  return [index, () => setState(x => (x >= Number.MAX_SAFE_INTEGER ? 0 : x + 1))] as const;
};

type SlotOptions<Props extends SlotProps> =
  IsVoid<Props> extends true
    ? {
        props?: void;
        divider?: ReactNode;
      }
    : {
        props: Props;
        divider?: ReactNode;
      };

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

  return useMemo(() => slot.render({ props, divider: options?.divider }), [handlers, index, props]);
};

export const Slot = <Props extends SlotProps>({
  id,
  props,
  divider,
}: SlotOptions<Props> & { id: SlotIdentifier<Props> }) => {
  // @ts-expect-error props typing
  return <>{useSlot(id, { props, divider })}</>;
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

  return pipeline(value, fixedMeta);
};

export type UseAnyOfArguments<Value> =
  IsVoid<Value> extends true
    ? [anyOf: AnyOfIdentifier<Value>, value?: Value]
    : [anyOf: AnyOfIdentifier<Value>, value: Value];

export const useAnyOf = <Value,>(...[anyOf, value]: UseAnyOfArguments<Value>) => {
  const [_, update] = useForceUpdate();
  const fixedValue = value as Value;

  // eslint-disable-next-line effector/no-watch
  useEffect(() => anyOf.updateHandlers.watch(update), []);

  return anyOf.check(fixedValue);
};

export type UseTransformerArguments<Input, Output, Meta> =
  IsVoid<Meta> extends true
    ? [pipeline: TransformerIdentifier<Input, Output, Meta>, input: Input, meta?: Meta]
    : [pipeline: TransformerIdentifier<Input, Output, Meta>, input: Input, meta: Meta];

export const useTransformer = <Input, Output, Meta>(
  ...[transformer, input, meta]: UseTransformerArguments<Input, Output, Meta>
) => {
  const [_, update] = useForceUpdate();
  const fixedMeta = (meta ?? undefined) as Exclude<Meta, void>;

  // eslint-disable-next-line effector/no-watch
  useEffect(() => transformer.updateHandlers.watch(update), []);

  return transformer(input, fixedMeta);
};
