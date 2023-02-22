import { isAddress } from '@polkadot/util-crypto';

export const MatrixIdRegex = /@[\w\d\-_]*:(?:[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?\.)+[a-z0-9][a-z0-9-]{0,61}[a-z0-9]/i;

export const validateAddress = (address: string): boolean => isAddress(address);
export const validateMatrixId = (matrixId?: string): boolean => !matrixId || MatrixIdRegex.test(matrixId);
