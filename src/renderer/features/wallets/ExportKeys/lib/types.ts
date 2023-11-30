import { ChainId, KeyType as DdKeyType } from '@shared/core';

export type ExportedDerivation = {
  key: {
    derivation_path: string;
    type: DdKeyType;
    name?: string;
    sharded?: number;
  };
};

export type DynamicDerivationsExport = {
  version: '1';
  [root: string]: Record<ChainId, ExportedDerivation[]>;
};
