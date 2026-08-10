import { type ChainId, type HexString } from '@/shared/core';
import { type UNIVERSAL_GENESIS } from '@/shared/lib/utils';
import { type DerivationKeyDraft } from '@/features/polkadot-vault-wallet';

export { type DerivationKeyDraft };

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
  ETHEREUM_SINGLE_SLASH = 'ETHEREUM_SINGLE_SLASH',
}

export type ImportedDerivation = {
  derivationPath?: string;
  chainId?: string;
  sharded?: string;
};

export type DerivationWithPath = ImportedDerivation & Required<Pick<ImportedDerivation, 'derivationPath'>>;

export type TypedImportedDerivation = {
  derivationPath: string;
  /** `UNIVERSAL_GENESIS` when the file scopes the key to no network. */
  chainId: ChainId | typeof UNIVERSAL_GENESIS;
  sharded?: string;
};

export type ParsedData = {
  version: string;
  publicAddress: HexString;
  derivationPaths: ImportedDerivation[];
};
