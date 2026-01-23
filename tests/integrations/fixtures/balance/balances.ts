import { type AssetId, type Balance } from '@/shared/core';
import { balanceUtils } from '@/entities/balance';
import { multisigAccount, proxyAccount, senderAccount, signatoryAccount } from '../account';
import { assetHubChainId, polkadotChainId } from '../chain';

/**
 * Standard sender balance (1000 DOT)
 */
export const senderBalance: Balance = {
  id: balanceUtils.constructBalanceId(senderAccount.accountId, polkadotChainId, 0 as AssetId),
  accountId: senderAccount.accountId,
  chainId: polkadotChainId,
  assetId: 0 as AssetId,
  total: '10000000000000', // 1000 DOT
  frozen: '0',
  reserved: '0',
  transferable: 'legacy',
} as unknown as Balance;

/**
 * Low sender balance (2 DOT - barely enough for fees)
 */
export const senderLowBalance: Balance = {
  ...(senderBalance as any),
  total: '20000000000', // 2 DOT
} as unknown as Balance;

/**
 * Sender balance on Asset Hub (500 DOT)
 */
export const senderAssetHubBalance: Balance = {
  id: balanceUtils.constructBalanceId(senderAccount.accountId, assetHubChainId, 0 as AssetId),
  accountId: senderAccount.accountId,
  chainId: assetHubChainId,
  assetId: 0 as AssetId,
  total: '5000000000', // 500 DOT
  frozen: '0',
  reserved: '0',
  transferable: 'legacy',
} as unknown as Balance;

/**
 * Sender USDT balance on Asset Hub (1000 USDT)
 */
export const senderUsdtBalance: Balance = {
  id: balanceUtils.constructBalanceId(senderAccount.accountId, assetHubChainId, 1337 as AssetId),
  accountId: senderAccount.accountId,
  chainId: assetHubChainId,
  assetId: 1337 as AssetId,
  total: '1000000000', // 1000 USDT
  frozen: '0',
  reserved: '0',
  transferable: 'legacy',
} as unknown as Balance;

/**
 * Multisig account balance (5000 DOT)
 */
export const multisigBalance: Balance = {
  id: balanceUtils.constructBalanceId(multisigAccount.accountId, polkadotChainId, 0 as AssetId),
  accountId: multisigAccount.accountId,
  chainId: polkadotChainId,
  assetId: 0 as AssetId,
  total: '50000000000000', // 5000 DOT
  frozen: '0',
  reserved: '0',
  transferable: 'legacy',
} as unknown as Balance;

/**
 * Signatory balance (200 DOT for fees)
 */
export const signatoryBalance: Balance = {
  id: balanceUtils.constructBalanceId(signatoryAccount.accountId, polkadotChainId, 0 as AssetId),
  accountId: signatoryAccount.accountId,
  chainId: polkadotChainId,
  assetId: 0 as AssetId,
  total: '2000000000000', // 200 DOT
  frozen: '0',
  reserved: '0',
  transferable: 'legacy',
} as unknown as Balance;

/**
 * Proxy account balance (100 DOT for fees)
 */
export const proxyBalance: Balance = {
  id: balanceUtils.constructBalanceId(proxyAccount.accountId, polkadotChainId, 0 as AssetId),
  accountId: proxyAccount.accountId,
  chainId: polkadotChainId,
  assetId: 0 as AssetId,
  total: '1000000000000', // 100 DOT
  frozen: '0',
  reserved: '0',
  transferable: 'legacy',
} as unknown as Balance;

/**
 * Helper function to create a balance for testing
 */
export function createBalance(accountId: string, chainId: string, assetId: number, total: string): Balance {
  return {
    id: `${accountId}-${chainId}-${assetId}` as any,
    accountId: accountId as any,
    chainId: chainId as any,
    assetId: assetId as AssetId,
    total,
    frozen: '0',
    reserved: '0',
    transferable: 'legacy',
  } as unknown as Balance;
}
