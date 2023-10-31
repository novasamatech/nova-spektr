import { ChainId, HexString, KeyType } from '@renderer/shared/core';
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
  error: ImportErrorsLabel;
  tArgs?: any; // args for t()
};

export type ImportedDerivation = {
  derivationPath?: string;
  chainId?: string;
  sharded?: string;
  type?: string;
};

export type TypedImportedDerivation = {
  derivationPath: string;
  type: KeyType;
  chainId: ChainId;
  sharded?: number;
};

export class DerivationImportError extends Error {
  paths?: string[];
  message: ImportErrorsLabel;
  constructor(message: ImportErrorsLabel, invalidPaths?: string[]) {
    super(message);
    this.message = message;
    this.paths = invalidPaths;
  }
}
