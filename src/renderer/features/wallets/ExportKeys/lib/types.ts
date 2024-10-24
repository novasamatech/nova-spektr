import { type ChainId, type KeyType as DdKeyType } from '@/shared/core';

export type ExportedDerivation = {
  key: {
    derivation_path: string;
    type: DdKeyType;
    name?: string;
    sharded?: string;
  };
};

export type DynamicDerivationsExport = {
  [root: string]: Record<ChainId, ExportedDerivation[]> | '1';
};
