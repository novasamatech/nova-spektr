import type { ChainId, Explorer, HexString, Address, AccountId } from '@shared/core';
import { toAddress } from './address';
import { SS58_DEFAULT_PREFIX } from './constants';

export const toLocalChainId = (chainId?: ChainId): string | undefined => {
  return chainId?.replace('0x', '');
};

export const toHexChainId = (chainId?: string): ChainId | undefined => {
  return `0x${chainId?.replace('0x', '')}`;
};

type WithAddress = { address: Address };
type WithAccountId = { value: Address | AccountId; addressPrefix?: number };
/**
 * Get block explorer URL by AccountId or Address
 * @param explorer explorer with links
 * @param params address or accountId with addressPrefix
 * @return {String | undefined}
 */
export const getAccountExplorer = (explorer: Explorer, params: WithAddress | WithAccountId): string | undefined => {
  const replacer =
    'value' in params
      ? toAddress(params.value, { prefix: params.addressPrefix ?? SS58_DEFAULT_PREFIX })
      : params.address;

  return explorer.account?.replace('{address}', replacer);
};

/**
 * Get extrinsic explorer URL by hash
 * @param explorer explorer with links
 * @param hash extrinsic hash
 * @return {String | undefined}
 */
export const getExtrinsicExplorer = (explorer: Explorer, hash: HexString): string | undefined => {
  return explorer.extrinsic?.replace('{hash}', hash);
};
