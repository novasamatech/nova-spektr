import { type Balance } from '@/shared/core';
import { multisigAccount, proxyAccount, senderAccount, signatoryAccount } from '../account';
import { assetHubChainId, polkadotChainId } from '../chain';

/**
 * Standard sender balance (1000 DOT)
 */
export const senderBalance: Balance = {
  id: `${senderAccount.accountId}-${polkadotChainId}-${0}`,
  accountId: senderAccount.accountId,
  chainId: polkadotChainId,
  assetId: 0,
  total: '10000000000000', // 1000 DOT
  frozen: '0',
  reserved: '0',
  transferable: 'legacy',
};

/**
 * Low sender balance (2 DOT - barely enough for fees)
 */
export const senderLowBalance: Balance = {
  ...senderBalance,
  total: '20000000000', // 2 DOT
};

/**
 * Sender balance on Asset Hub (500 DOT)
 */
export const senderAssetHubBalance: Balance = {
  id: `${senderAccount.accountId}-${assetHubChainId}-${0}`,
  accountId: senderAccount.accountId,
  chainId: assetHubChainId,
  assetId: 0,
  total: '5000000000', // 500 DOT
  frozen: '0',
  reserved: '0',
  transferable: 'legacy',
};

/**
 * Sender USDT balance on Asset Hub (1000 USDT)
 */
export const senderUsdtBalance: Balance = {
  id: `${senderAccount.accountId}-${assetHubChainId}-${1337}`,
  accountId: senderAccount.accountId,
  chainId: assetHubChainId,
  assetId: 1337,
  total: '1000000000', // 1000 USDT
  frozen: '0',
  reserved: '0',
  transferable: 'legacy',
};

/**
 * Multisig account balance (5000 DOT)
 */
export const multisigBalance: Balance = {
  id: `${multisigAccount.accountId}-${polkadotChainId}-${0}`,
  accountId: multisigAccount.accountId,
  chainId: polkadotChainId,
  assetId: 0,
  total: '50000000000000', // 5000 DOT
  frozen: '0',
  reserved: '0',
  transferable: 'legacy',
};

/**
 * Signatory balance (200 DOT for fees)
 */
export const signatoryBalance: Balance = {
  id: `${signatoryAccount.accountId}-${polkadotChainId}-${0}`,
  accountId: signatoryAccount.accountId,
  chainId: polkadotChainId,
  assetId: 0,
  total: '2000000000000', // 200 DOT
  frozen: '0',
  reserved: '0',
  transferable: 'legacy',
};

/**
 * Proxy account balance (100 DOT for fees)
 */
export const proxyBalance: Balance = {
  id: `${proxyAccount.accountId}-${polkadotChainId}-${0}`,
  accountId: proxyAccount.accountId,
  chainId: polkadotChainId,
  assetId: 0,
  total: '1000000000000', // 100 DOT
  frozen: '0',
  reserved: '0',
  transferable: 'legacy',
};

/**
 * Helper function to create a balance for testing
 */
export function createBalance(accountId: string, chainId: string, assetId: number, total: string): Balance {
  return {
    id: `${accountId}-${chainId}-${assetId}`,
    accountId,
    chainId,
    assetId,
    total,
    frozen: '0',
    reserved: '0',
    transferable: 'legacy',
  };
}
