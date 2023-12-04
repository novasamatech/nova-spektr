import { ChainId, HexString, KeyType } from '@renderer/shared/core';

type DerivationPropertyName = 'derivation_path' | 'type' | 'sharded';
type KeyProperties = { [key in DerivationPropertyName]: string | number };
export type ImportFileKey = { key: KeyProperties[] };
export type ImportFileChain = { [key: HexString]: ImportFileKey[] };
export type ParsedImportFile = {
  [key: HexString]: ImportFileChain;
  version: number;
};

export const enum ValidationError {
  INVALID_FILE_STRUCTURE,
  INVALID_ROOT,
  DERIVATIONS_ERROR,
}

export enum DerivationValidationError {
  INVALID_PATH = 'INVALID_PATH',
  MISSING_NAME = 'MISSING_NAME',
  WRONG_SHARDS_NUMBER = 'WRONG_SHARDS_NUMBER',
  PASSWORD_PATH = 'PASSWORD_PATH',
}

export type ImportedDerivation = {
  derivationPath?: string;
  chainId?: string;
  sharded?: string;
  name?: string;
  type?: string;
};

export type DerivationWithPath = ImportedDerivation & Required<Pick<ImportedDerivation, 'derivationPath'>>;

export type TypedImportedDerivation = {
  derivationPath: string;
  name?: string;
  type: KeyType;
  chainId: ChainId;
  sharded?: string;
};
