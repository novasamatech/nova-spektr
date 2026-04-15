import { type ChainId, type HexString } from '@/shared/core';

export type OperationTemplate = {
  id: number;
  name: string;
  chainId: ChainId;
  callData: HexString;
  specVersion: number;
  createdAt: number;
};

export type NewOperationTemplate = Omit<OperationTemplate, 'id' | 'createdAt'>;
