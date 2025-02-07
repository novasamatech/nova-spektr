import { type BasketTransaction } from '@/shared/core';
import { createSlot, useSlot } from '@/shared/di';

type SlotProps = {
  operation: BasketTransaction;
};

type Props = {
  operation: BasketTransaction;
};

export const confirmTitleSlot = createSlot<SlotProps>();
export const confirmDetailsSlot = createSlot<SlotProps>();

export const OperationConfirm = ({ operation }: Props) => {
  const confirmTitle = useSlot(confirmTitleSlot, { props: { operation } });
  const confirmDetails = useSlot(confirmDetailsSlot, { props: { operation } });

  return (
    <div>
      {confirmTitle}
      {confirmDetails}
    </div>
  );
};
