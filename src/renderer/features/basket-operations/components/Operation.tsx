import { type BasketTransaction } from '@/shared/core';
import { createSlot, useSlot } from '@/shared/di';

type Props = {
  operation: BasketTransaction;
};

type SlotProps = {
  operation: BasketTransaction;
};

export const operationTitleSlot = createSlot<SlotProps>();

export const Operation = ({ operation }: Props) => {
  const operationTitle = useSlot(operationTitleSlot, { props: { operation } });

  // eslint-disable-next-line react/jsx-no-useless-fragment
  return <>{operationTitle}</>;
};
