import { WellKnownChain } from '@substrate/connect';

import {
  type AccountId,
  type Address,
  type Chain,
  type ChainId,
  ChainOptions,
  type Explorer,
  type HexString,
} from '@/shared/core';

import { toAddress } from './address';
import { RelayChains, SS58_DEFAULT_PREFIX } from './constants';

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
 *
 * @param explorer Explorer with links
 * @param params Address or accountId with addressPrefix
 *
 * @returns {String | undefined}
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
 *
 * @param explorer Explorer with links
 * @param hash Extrinsic hash
 *
 * @returns {String | undefined}
 */
export const getExtrinsicExplorer = (explorer: Explorer, hash: HexString): string | undefined => {
  return explorer.extrinsic?.replace('{hash}', hash);
};

/**
 * Get relay chain id that are relevant chain specification and are likely to be
 * connected to
 *
 * @param chainId Genesis hash of the chain
 *
 * @returns {WellKnownChain | undefined}
 */
export function getKnownChain(chainId: ChainId): WellKnownChain | undefined {
  return {
    [RelayChains.POLKADOT]: WellKnownChain.polkadot,
    [RelayChains.KUSAMA]: WellKnownChain.ksmcc3,
    [RelayChains.WESTEND]: WellKnownChain.westend2,
    [RelayChains.ROCOCO]: WellKnownChain.rococo_v2_2,
  }[chainId];
}

/**
 * Check whether chain is evm or not
 *
 * @param chain Value to check
 *
 * @returns {Boolean}
 */
export function isEvmChain(chain: Chain): boolean {
  return chain.options?.includes(ChainOptions.ETHEREUM_BASED) ?? false;
}
