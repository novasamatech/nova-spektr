import { ProxiedAccount, ProxiedWallet, ProxyType, Wallet, WalletType } from '@shared/core';
import { permissionUtils } from '../permission-utils';

const wallets = [
  {
    name: 'watch only wallet',
    type: WalletType.WATCH_ONLY,
  },
  {
    name: 'polkadot vault wallet',
    type: WalletType.POLKADOT_VAULT,
  },
  {
    name: 'nova wallet',
    type: WalletType.NOVA_WALLET,
  },
  {
    name: 'wallet connect',
    type: WalletType.WALLET_CONNECT,
  },
  {
    name: 'single parity signer wallet',
    type: WalletType.SINGLE_PARITY_SIGNER,
  },
  {
    name: 'multishard wallet',
    type: WalletType.MULTISHARD_PARITY_SIGNER,
  },
  {
    name: 'multisig wallet',
    type: WalletType.MULTISIG,
  },
] as Wallet[];

const proxiedWallet = {
  name: 'proxied wallet',
  type: WalletType.PROXIED,
} as ProxiedWallet;

const accounts = [
  {
    proxyType: ProxyType.ANY,
  },
  {
    proxyType: ProxyType.NON_TRANSFER,
  },
  {
    proxyType: ProxyType.STAKING,
  },
  {
    proxyType: ProxyType.AUCTION,
  },
  {
    proxyType: ProxyType.CANCEL_PROXY,
  },
  {
    proxyType: ProxyType.GOVERNANCE,
  },
  {
    proxyType: ProxyType.IDENTITY_JUDGEMENT,
  },
  {
    proxyType: ProxyType.NOMINATION_POOLS,
  },
] as ProxiedAccount[];

describe('shared/api/permission/permissionUtils.ts', () => {
  test('should return correct values for transfer available for all wallets', () => {
    expect(permissionUtils.isTransferAvailable(wallets[0], [])).toEqual(false);
    expect(permissionUtils.isTransferAvailable(wallets[1], [])).toEqual(true);
    expect(permissionUtils.isTransferAvailable(wallets[2], [])).toEqual(true);
    expect(permissionUtils.isTransferAvailable(wallets[3], [])).toEqual(true);
    expect(permissionUtils.isTransferAvailable(wallets[4], [])).toEqual(true);
    expect(permissionUtils.isTransferAvailable(wallets[5], [])).toEqual(true);
    expect(permissionUtils.isTransferAvailable(wallets[6], [])).toEqual(true);
  });

  test('should return correct values for receive available for all wallets', () => {
    expect(permissionUtils.isReceiveAvailable(wallets[0], [])).toEqual(false);
    expect(permissionUtils.isReceiveAvailable(wallets[1], [])).toEqual(true);
    expect(permissionUtils.isReceiveAvailable(wallets[2], [])).toEqual(true);
    expect(permissionUtils.isReceiveAvailable(wallets[3], [])).toEqual(true);
    expect(permissionUtils.isReceiveAvailable(wallets[4], [])).toEqual(true);
    expect(permissionUtils.isReceiveAvailable(wallets[5], [])).toEqual(true);
    expect(permissionUtils.isReceiveAvailable(wallets[6], [])).toEqual(true);
    expect(permissionUtils.isReceiveAvailable(proxiedWallet, [])).toEqual(true);
  });

  test('should return correct values for staking available for all wallets', () => {
    expect(permissionUtils.isStakingAvailable(wallets[0], [])).toEqual(false);
    expect(permissionUtils.isStakingAvailable(wallets[1], [])).toEqual(true);
    expect(permissionUtils.isStakingAvailable(wallets[2], [])).toEqual(true);
    expect(permissionUtils.isStakingAvailable(wallets[3], [])).toEqual(true);
    expect(permissionUtils.isStakingAvailable(wallets[4], [])).toEqual(true);
    expect(permissionUtils.isStakingAvailable(wallets[5], [])).toEqual(true);
    expect(permissionUtils.isStakingAvailable(wallets[6], [])).toEqual(true);
  });

  test('should return correct values for create multisig tx available for all wallets', () => {
    expect(permissionUtils.isCreateMultisigTxAvailable(wallets[0], [])).toEqual(false);
    expect(permissionUtils.isCreateMultisigTxAvailable(wallets[1], [])).toEqual(true);
    expect(permissionUtils.isCreateMultisigTxAvailable(wallets[2], [])).toEqual(true);
    expect(permissionUtils.isCreateMultisigTxAvailable(wallets[3], [])).toEqual(true);
    expect(permissionUtils.isCreateMultisigTxAvailable(wallets[4], [])).toEqual(true);
    expect(permissionUtils.isCreateMultisigTxAvailable(wallets[5], [])).toEqual(true);
    expect(permissionUtils.isCreateMultisigTxAvailable(wallets[6], [])).toEqual(false);
  });

  test('should return correct values for approve multisig tx available for all wallets', () => {
    expect(permissionUtils.isApproveMultisigTxAvailable(wallets[0], [])).toEqual(false);
    expect(permissionUtils.isApproveMultisigTxAvailable(wallets[1], [])).toEqual(true);
    expect(permissionUtils.isApproveMultisigTxAvailable(wallets[2], [])).toEqual(true);
    expect(permissionUtils.isApproveMultisigTxAvailable(wallets[3], [])).toEqual(true);
    expect(permissionUtils.isApproveMultisigTxAvailable(wallets[4], [])).toEqual(true);
    expect(permissionUtils.isApproveMultisigTxAvailable(wallets[5], [])).toEqual(true);
    expect(permissionUtils.isApproveMultisigTxAvailable(wallets[6], [])).toEqual(false);
  });

  test('should return correct values for reject multisig tx available for all wallets', () => {
    expect(permissionUtils.isRejectMultisigTxAvailable(wallets[0], [])).toEqual(false);
    expect(permissionUtils.isRejectMultisigTxAvailable(wallets[1], [])).toEqual(true);
    expect(permissionUtils.isRejectMultisigTxAvailable(wallets[2], [])).toEqual(true);
    expect(permissionUtils.isRejectMultisigTxAvailable(wallets[3], [])).toEqual(true);
    expect(permissionUtils.isRejectMultisigTxAvailable(wallets[4], [])).toEqual(true);
    expect(permissionUtils.isRejectMultisigTxAvailable(wallets[5], [])).toEqual(true);
    expect(permissionUtils.isRejectMultisigTxAvailable(wallets[6], [])).toEqual(false);
  });

  test('should return correct values for create any proxy available for all wallets', () => {
    expect(permissionUtils.isCreateAnyProxyAvailable(wallets[0], [])).toEqual(false);
    expect(permissionUtils.isCreateAnyProxyAvailable(wallets[1], [])).toEqual(true);
    expect(permissionUtils.isCreateAnyProxyAvailable(wallets[2], [])).toEqual(true);
    expect(permissionUtils.isCreateAnyProxyAvailable(wallets[3], [])).toEqual(true);
    expect(permissionUtils.isCreateAnyProxyAvailable(wallets[4], [])).toEqual(true);
    expect(permissionUtils.isCreateAnyProxyAvailable(wallets[5], [])).toEqual(true);
    expect(permissionUtils.isCreateAnyProxyAvailable(wallets[6], [])).toEqual(true);
  });

  test('should return correct values for create non any proxy available for all wallets', () => {
    expect(permissionUtils.isCreateNonAnyProxyAvailable(wallets[0], [])).toEqual(false);
    expect(permissionUtils.isCreateNonAnyProxyAvailable(wallets[1], [])).toEqual(true);
    expect(permissionUtils.isCreateNonAnyProxyAvailable(wallets[2], [])).toEqual(true);
    expect(permissionUtils.isCreateNonAnyProxyAvailable(wallets[3], [])).toEqual(true);
    expect(permissionUtils.isCreateNonAnyProxyAvailable(wallets[4], [])).toEqual(true);
    expect(permissionUtils.isCreateNonAnyProxyAvailable(wallets[5], [])).toEqual(true);
    expect(permissionUtils.isCreateNonAnyProxyAvailable(wallets[6], [])).toEqual(true);
  });

  test('should return correct values for remove proxy available for all wallets', () => {
    expect(permissionUtils.isRemoveProxyAvailable(wallets[0], [])).toEqual(false);
    expect(permissionUtils.isRemoveProxyAvailable(wallets[1], [])).toEqual(true);
    expect(permissionUtils.isRemoveProxyAvailable(wallets[2], [])).toEqual(true);
    expect(permissionUtils.isRemoveProxyAvailable(wallets[3], [])).toEqual(true);
    expect(permissionUtils.isRemoveProxyAvailable(wallets[4], [])).toEqual(true);
    expect(permissionUtils.isRemoveProxyAvailable(wallets[5], [])).toEqual(true);
    expect(permissionUtils.isRemoveProxyAvailable(wallets[6], [])).toEqual(true);
  });

  test('should return correct values for transfer available for all types of proxied wallet', () => {
    expect(permissionUtils.isTransferAvailable(proxiedWallet, [accounts[0]])).toEqual(true);
    expect(permissionUtils.isTransferAvailable(proxiedWallet, [accounts[1]])).toEqual(false);
    expect(permissionUtils.isTransferAvailable(proxiedWallet, [accounts[2]])).toEqual(false);
    expect(permissionUtils.isTransferAvailable(proxiedWallet, [accounts[3]])).toEqual(false);
    expect(permissionUtils.isTransferAvailable(proxiedWallet, [accounts[4]])).toEqual(false);
    expect(permissionUtils.isTransferAvailable(proxiedWallet, [accounts[5]])).toEqual(false);
    expect(permissionUtils.isTransferAvailable(proxiedWallet, [accounts[6]])).toEqual(false);
    expect(permissionUtils.isTransferAvailable(proxiedWallet, [accounts[7]])).toEqual(false);
  });

  test('should return correct values for staking available for all types of proxied wallet', () => {
    expect(permissionUtils.isStakingAvailable(proxiedWallet, [accounts[0]])).toEqual(true);
    expect(permissionUtils.isStakingAvailable(proxiedWallet, [accounts[1]])).toEqual(true);
    expect(permissionUtils.isStakingAvailable(proxiedWallet, [accounts[2]])).toEqual(true);
    expect(permissionUtils.isStakingAvailable(proxiedWallet, [accounts[3]])).toEqual(false);
    expect(permissionUtils.isStakingAvailable(proxiedWallet, [accounts[4]])).toEqual(false);
    expect(permissionUtils.isStakingAvailable(proxiedWallet, [accounts[5]])).toEqual(false);
    expect(permissionUtils.isStakingAvailable(proxiedWallet, [accounts[6]])).toEqual(false);
    expect(permissionUtils.isStakingAvailable(proxiedWallet, [accounts[7]])).toEqual(false);
  });

  test('should return correct values for create multisig tx available for all types of proxied wallet', () => {
    expect(permissionUtils.isCreateMultisigTxAvailable(proxiedWallet, [accounts[0]])).toEqual(true);
    expect(permissionUtils.isCreateMultisigTxAvailable(proxiedWallet, [accounts[1]])).toEqual(true);
    expect(permissionUtils.isCreateMultisigTxAvailable(proxiedWallet, [accounts[2]])).toEqual(false);
    expect(permissionUtils.isCreateMultisigTxAvailable(proxiedWallet, [accounts[3]])).toEqual(false);
    expect(permissionUtils.isCreateMultisigTxAvailable(proxiedWallet, [accounts[4]])).toEqual(false);
    expect(permissionUtils.isCreateMultisigTxAvailable(proxiedWallet, [accounts[5]])).toEqual(false);
    expect(permissionUtils.isCreateMultisigTxAvailable(proxiedWallet, [accounts[6]])).toEqual(false);
    expect(permissionUtils.isCreateMultisigTxAvailable(proxiedWallet, [accounts[7]])).toEqual(false);
  });

  test('should return correct values for approve multisig tx available for all types of proxied wallet', () => {
    expect(permissionUtils.isApproveMultisigTxAvailable(proxiedWallet, [accounts[0]])).toEqual(true);
    expect(permissionUtils.isApproveMultisigTxAvailable(proxiedWallet, [accounts[1]])).toEqual(true);
    expect(permissionUtils.isApproveMultisigTxAvailable(proxiedWallet, [accounts[2]])).toEqual(false);
    expect(permissionUtils.isApproveMultisigTxAvailable(proxiedWallet, [accounts[3]])).toEqual(false);
    expect(permissionUtils.isApproveMultisigTxAvailable(proxiedWallet, [accounts[4]])).toEqual(false);
    expect(permissionUtils.isApproveMultisigTxAvailable(proxiedWallet, [accounts[5]])).toEqual(false);
    expect(permissionUtils.isApproveMultisigTxAvailable(proxiedWallet, [accounts[6]])).toEqual(false);
    expect(permissionUtils.isApproveMultisigTxAvailable(proxiedWallet, [accounts[7]])).toEqual(false);
  });

  test('should return correct values for reject multisig tx available for all types of proxied wallet', () => {
    expect(permissionUtils.isRejectMultisigTxAvailable(proxiedWallet, [accounts[0]])).toEqual(true);
    expect(permissionUtils.isRejectMultisigTxAvailable(proxiedWallet, [accounts[1]])).toEqual(true);
    expect(permissionUtils.isRejectMultisigTxAvailable(proxiedWallet, [accounts[2]])).toEqual(false);
    expect(permissionUtils.isRejectMultisigTxAvailable(proxiedWallet, [accounts[3]])).toEqual(false);
    expect(permissionUtils.isRejectMultisigTxAvailable(proxiedWallet, [accounts[4]])).toEqual(false);
    expect(permissionUtils.isRejectMultisigTxAvailable(proxiedWallet, [accounts[5]])).toEqual(false);
    expect(permissionUtils.isRejectMultisigTxAvailable(proxiedWallet, [accounts[6]])).toEqual(false);
    expect(permissionUtils.isRejectMultisigTxAvailable(proxiedWallet, [accounts[7]])).toEqual(false);
  });

  test('should return correct values for create any proxy available for all types of proxied wallet', () => {
    expect(permissionUtils.isCreateAnyProxyAvailable(proxiedWallet, [accounts[0]])).toEqual(true);
    expect(permissionUtils.isCreateAnyProxyAvailable(proxiedWallet, [accounts[1]])).toEqual(false);
    expect(permissionUtils.isCreateAnyProxyAvailable(proxiedWallet, [accounts[2]])).toEqual(false);
    expect(permissionUtils.isCreateAnyProxyAvailable(proxiedWallet, [accounts[3]])).toEqual(false);
    expect(permissionUtils.isCreateAnyProxyAvailable(proxiedWallet, [accounts[4]])).toEqual(false);
    expect(permissionUtils.isCreateAnyProxyAvailable(proxiedWallet, [accounts[5]])).toEqual(false);
    expect(permissionUtils.isCreateAnyProxyAvailable(proxiedWallet, [accounts[6]])).toEqual(false);
    expect(permissionUtils.isCreateAnyProxyAvailable(proxiedWallet, [accounts[7]])).toEqual(false);
  });

  test('should return correct values for create non any proxy available for all types of proxied wallet', () => {
    expect(permissionUtils.isCreateNonAnyProxyAvailable(proxiedWallet, [accounts[0]])).toEqual(true);
    expect(permissionUtils.isCreateNonAnyProxyAvailable(proxiedWallet, [accounts[1]])).toEqual(true);
    expect(permissionUtils.isCreateNonAnyProxyAvailable(proxiedWallet, [accounts[2]])).toEqual(false);
    expect(permissionUtils.isCreateNonAnyProxyAvailable(proxiedWallet, [accounts[3]])).toEqual(false);
    expect(permissionUtils.isCreateNonAnyProxyAvailable(proxiedWallet, [accounts[4]])).toEqual(false);
    expect(permissionUtils.isCreateNonAnyProxyAvailable(proxiedWallet, [accounts[5]])).toEqual(false);
    expect(permissionUtils.isCreateNonAnyProxyAvailable(proxiedWallet, [accounts[6]])).toEqual(false);
    expect(permissionUtils.isCreateNonAnyProxyAvailable(proxiedWallet, [accounts[7]])).toEqual(false);
  });

  test('should return correct values for remove proxy available for all types of proxied wallet', () => {
    expect(permissionUtils.isRemoveProxyAvailable(proxiedWallet, [accounts[0]])).toEqual(true);
    expect(permissionUtils.isRemoveProxyAvailable(proxiedWallet, [accounts[1]])).toEqual(true);
    expect(permissionUtils.isRemoveProxyAvailable(proxiedWallet, [accounts[2]])).toEqual(false);
    expect(permissionUtils.isRemoveProxyAvailable(proxiedWallet, [accounts[3]])).toEqual(false);
    expect(permissionUtils.isRemoveProxyAvailable(proxiedWallet, [accounts[4]])).toEqual(false);
    expect(permissionUtils.isRemoveProxyAvailable(proxiedWallet, [accounts[5]])).toEqual(false);
    expect(permissionUtils.isRemoveProxyAvailable(proxiedWallet, [accounts[6]])).toEqual(false);
    expect(permissionUtils.isRemoveProxyAvailable(proxiedWallet, [accounts[7]])).toEqual(false);
  });
});
