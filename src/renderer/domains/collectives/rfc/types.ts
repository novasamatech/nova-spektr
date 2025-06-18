import { type ChainId } from '@/shared/core';
import { type CollectivePalletsType } from '../_lib/types';

export type RfcDetails = {
  title: string;
  summary: string;
  prNumber: string;
  palletType: CollectivePalletsType;
  chainId: ChainId;
};
