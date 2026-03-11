import { BN } from '@polkadot/util';

import { type AssetId, type Balance, type ChainId, AssetType } from '@/shared/core';
import { type AccountId } from '@/shared/polkadotjs-schemas';
import { balanceUtils } from '@/entities/balance';
import { multisigAccount, proxyAccount, senderAccount, signatoryAccount } from '../account';
import { assetHubChainId, polkadotChainId } from '../chain';

// eslint-disable-next-line @typescript-eslint/consistent-type-assertions
const toAssetId = (n: number) => n as AssetId;

/**
 * Standard sender balance (1000 DOT)
 */
export const senderBalance: Balance = {
  id: balanceUtils.constructBalanceId(senderAccount.accountId, polkadotChainId, toAssetId(0)),
  accountId: senderAccount.accountId,
  chainId: polkadotChainId,
  assetId: toAssetId(0),
  assetType: AssetType.NATIVE,
  free: new BN('10000000000000'), // 1000 DOT
  frozen: new BN('0'),
  reserved: new BN('0'),
  locked: [],
  transferableMode: 'legacy',
  providers: 1,
  consumers: 0,
  sufficients: 0,
  ed: new BN('10000000000'), // 1 DOT ED
};

/**
 * Low sender balance (2 DOT - barely enough for fees)
 */
export const senderLowBalance: Balance = {
  ...senderBalance,
  free: new BN('20000000000'), // 2 DOT
};

/**
 * Sender balance on Asset Hub (500 DOT)
 */
export const senderAssetHubBalance: Balance = {
  id: balanceUtils.constructBalanceId(senderAccount.accountId, assetHubChainId, toAssetId(0)),
  accountId: senderAccount.accountId,
  chainId: assetHubChainId,
  assetId: toAssetId(0),
  assetType: AssetType.NATIVE,
  free: new BN('5000000000'), // 500 DOT
  frozen: new BN('0'),
  reserved: new BN('0'),
  locked: [],
  transferableMode: 'legacy',
  providers: 1,
  consumers: 0,
  sufficients: 0,
  ed: new BN('10000000000'), // 1 DOT ED
};

/**
 * Sender USDT balance on Asset Hub (1000 USDT)
 */
export const senderUsdtBalance: Balance = {
  id: balanceUtils.constructBalanceId(senderAccount.accountId, assetHubChainId, toAssetId(1337)),
  accountId: senderAccount.accountId,
  chainId: assetHubChainId,
  assetId: toAssetId(1337),
  assetType: AssetType.STATEMINE,
  free: new BN('1000000000'), // 1000 USDT
  frozen: new BN('0'),
  reserved: new BN('0'),
  locked: [],
  transferableMode: 'legacy',
  providers: 1,
  consumers: 0,
  sufficients: 0,
  ed: new BN('100000'), // 0.1 USDT ED
};

/**
 * Multisig account balance (5000 DOT)
 */
export const multisigBalance: Balance = {
  id: balanceUtils.constructBalanceId(multisigAccount.accountId, polkadotChainId, toAssetId(0)),
  accountId: multisigAccount.accountId,
  chainId: polkadotChainId,
  assetId: toAssetId(0),
  assetType: AssetType.NATIVE,
  free: new BN('50000000000000'), // 5000 DOT
  frozen: new BN('0'),
  reserved: new BN('0'),
  locked: [],
  transferableMode: 'legacy',
  providers: 1,
  consumers: 0,
  sufficients: 0,
  ed: new BN('10000000000'), // 1 DOT ED
};

/**
 * Signatory balance (200 DOT for fees)
 */
export const signatoryBalance: Balance = {
  id: balanceUtils.constructBalanceId(signatoryAccount.accountId, polkadotChainId, toAssetId(0)),
  accountId: signatoryAccount.accountId,
  chainId: polkadotChainId,
  assetId: toAssetId(0),
  assetType: AssetType.NATIVE,
  free: new BN('2000000000000'), // 200 DOT
  frozen: new BN('0'),
  reserved: new BN('0'),
  locked: [],
  transferableMode: 'legacy',
  providers: 1,
  consumers: 0,
  sufficients: 0,
  ed: new BN('10000000000'), // 1 DOT ED
};

/**
 * Proxy account balance (100 DOT for fees)
 */
export const proxyBalance: Balance = {
  id: balanceUtils.constructBalanceId(proxyAccount.accountId, polkadotChainId, toAssetId(0)),
  accountId: proxyAccount.accountId,
  chainId: polkadotChainId,
  assetId: toAssetId(0),
  assetType: AssetType.NATIVE,
  free: new BN('1000000000000'), // 100 DOT
  frozen: new BN('0'),
  reserved: new BN('0'),
  locked: [],
  transferableMode: 'legacy',
  providers: 1,
  consumers: 0,
  sufficients: 0,
  ed: new BN('10000000000'), // 1 DOT ED
};

/**
 * Helper function to create a balance for testing
 */
export function createBalance(accountId: AccountId, chainId: ChainId, assetId: AssetId, freeAmount: string): Balance {
  return {
    id: balanceUtils.constructBalanceId(accountId, chainId, assetId),
    accountId,
    chainId,
    assetId,
    assetType: AssetType.NATIVE,
    free: new BN(freeAmount),
    frozen: new BN('0'),
    reserved: new BN('0'),
    locked: [],
    transferableMode: 'legacy',
    providers: 1,
    consumers: 0,
    sufficients: 0,
    ed: new BN('10000000000'), // 1 DOT ED default
  };
}
