import { useParams } from 'react-router-dom';

import { Slot, createSlot } from '@/shared/di';
import { Graphics } from '@/shared/ui-kit';

export const dappSlot = createSlot<{ id: string }>();

export const DappPage = () => {
  const { id } = useParams<'id'>();

  if (!id) {
    return (
      <div className="flex h-full flex-col items-center justify-center gap-4">
        <Graphics name="emptyList" size={178} />
      </div>
    );
  }

  return <Slot id={dappSlot} props={{ id }} />;
};
