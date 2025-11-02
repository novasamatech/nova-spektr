import { type ChainId, type HexString, type VaultShardAccount } from '@/shared/core';

export type ImportFileKey = { key: Omit<ImportedDerivation, 'chainId'> };
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

export const enum DerivationValidationError {
  INVALID_PATH = 'INVALID_PATH',
  WRONG_SHARDS_NUMBER = 'WRONG_SHARDS_NUMBER',
  PASSWORD_PATH = 'PASSWORD_PATH',
}

export type ImportedDerivation = {
  derivationPath?: string;
  chainId?: string;
  sharded?: string;
};

export type DerivationWithPath = ImportedDerivation & Required<Pick<ImportedDerivation, 'derivationPath'>>;

export type TypedImportedDerivation = {
  derivationPath: string;
  chainId: ChainId;
  sharded?: string;
};

export type DerivationKeyDraft = Pick<VaultShardAccount, 'chainId' | 'derivationPath'> & {
  groupId?: VaultShardAccount['groupId'];
};

export type ParsedData = {
  version: string;
  publicAddress: HexString;
  derivationPaths: ImportedDerivation[];
};
