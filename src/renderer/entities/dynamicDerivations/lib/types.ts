import { ChainId, HexString, KeyType, ObjectValues } from '@renderer/shared/core';
import { ImportErrorsLabel } from './constants';

type DerivationPropertyName = 'derivation_path' | 'type' | 'shaded';
type KeyProperties = { [key in DerivationPropertyName]: string | number };
export type ImportFileKey = { key: KeyProperties[] };
export type ImportFileChain = { [key: HexString]: ImportFileKey[] };
export type ParsedImportFile = {
  [key: HexString]: ImportFileChain;
  version: number;
};

export type ImportError = {
  error: ObjectValues<typeof ImportErrorsLabel>;
  tArgs?: any; // args for t()
};

export type ImportedDerivation = {
  derivationPath?: string;
  chainId?: string;
  sharded?: string;
  type?: string;
};

export type TypedImportedDerivation = Required<ImportedDerivation> & {
  type?: KeyType;
  chainId: ChainId;
  sharded?: number;
};

export class DerivationImportError extends Error {
  paths?: string[];
  constructor(message: ObjectValues<typeof ImportErrorsLabel>, invalidPaths?: string[]) {
    super(message);
    this.paths = invalidPaths;
  }
}
