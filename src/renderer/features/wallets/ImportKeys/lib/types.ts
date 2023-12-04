import { ChainId, HexString, KeyType } from '@renderer/shared/core';

export type ImportFileKey = { key: Omit<ImportedDerivation, 'chainId'> };
export type ImportFileChain = { [key: HexString]: ImportFileKey[] };
export type ParsedImportFile = {
  [key: HexString]: ImportFileChain;
  version: number;
};

export enum ValidationErrorsLabel {
  INVALID_FILE_STRUCTURE = 'dynamicDerivations.importKeys.error.invalidFile',
  INVALID_ROOT = 'dynamicDerivations.importKeys.error.invalidRoot',
  PASSWORD_PATH = 'dynamicDerivations.importKeys.error.invalidPasswordPath',
  INVALID_PATH = 'dynamicDerivations.importKeys.error.invalidPath',
}

export type ValidationError = {
  error: ValidationErrorsLabel;
  invalidPaths?: string[];
};

export type ImportedDerivation = {
  derivationPath?: string;
  chainId?: string;
  sharded?: string;
  name?: string;
  type?: string;
};

export type TypedImportedDerivation = {
  derivationPath: string;
  name?: string;
  type: KeyType;
  chainId: ChainId;
  sharded?: string;
};
