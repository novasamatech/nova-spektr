import { type ApiPromise } from '@polkadot/api';

import { type ChainId } from '@/shared/core';
import { createSlot } from '@/shared/di';

export type ExtrinsicBuilderToolbarSlotProps = {
  api: ApiPromise | null;
  chainId: ChainId;
  callData: string;
  specVersion: number | null;
  onApply: (callData: string) => void;
};

export const extrinsicBuilderToolbarSlot = createSlot<ExtrinsicBuilderToolbarSlotProps>({
  name: 'call-data-execute/extrinsic-builder-toolbar',
});
