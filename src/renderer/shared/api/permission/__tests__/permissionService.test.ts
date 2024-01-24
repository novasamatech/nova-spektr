import { ProxiedAccount, ProxiedWallet, ProxyType, Wallet, WalletType } from '../../../core';
import { permissionService } from '../permissionService';

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

describe('shared/api/permission/permissionService.ts', () => {
  it('should return correct values for transfer available for all wallets', () => {
    expect(permissionService.isTransferAvailable(wallets[0], [])).toBe(false);
    expect(permissionService.isTransferAvailable(wallets[1], [])).toBe(true);
    expect(permissionService.isTransferAvailable(wallets[2], [])).toBe(true);
    expect(permissionService.isTransferAvailable(wallets[3], [])).toBe(true);
    expect(permissionService.isTransferAvailable(wallets[4], [])).toBe(true);
    expect(permissionService.isTransferAvailable(wallets[5], [])).toBe(true);
    expect(permissionService.isTransferAvailable(wallets[6], [])).toBe(true);
  });

  it('should return correct values for receive available for all wallets', () => {
    expect(permissionService.isReceiveAvailable(wallets[0])).toBe(false);
    expect(permissionService.isReceiveAvailable(wallets[1])).toBe(true);
    expect(permissionService.isReceiveAvailable(wallets[2])).toBe(true);
    expect(permissionService.isReceiveAvailable(wallets[3])).toBe(true);
    expect(permissionService.isReceiveAvailable(wallets[4])).toBe(true);
    expect(permissionService.isReceiveAvailable(wallets[5])).toBe(true);
    expect(permissionService.isReceiveAvailable(wallets[6])).toBe(true);
    expect(permissionService.isReceiveAvailable(proxiedWallet)).toBe(true);
  });

  it('should return correct values for staking available for all wallets', () => {
    expect(permissionService.isStakingAvailable(wallets[0], [])).toBe(false);
    expect(permissionService.isStakingAvailable(wallets[1], [])).toBe(true);
    expect(permissionService.isStakingAvailable(wallets[2], [])).toBe(true);
    expect(permissionService.isStakingAvailable(wallets[3], [])).toBe(true);
    expect(permissionService.isStakingAvailable(wallets[4], [])).toBe(true);
    expect(permissionService.isStakingAvailable(wallets[5], [])).toBe(true);
    expect(permissionService.isStakingAvailable(wallets[6], [])).toBe(true);
  });

  it('should return correct values for create multisig tx available for all wallets', () => {
    expect(permissionService.isCreateMultisigTxAvailable(wallets[0], [])).toBe(false);
    expect(permissionService.isCreateMultisigTxAvailable(wallets[1], [])).toBe(true);
    expect(permissionService.isCreateMultisigTxAvailable(wallets[2], [])).toBe(true);
    expect(permissionService.isCreateMultisigTxAvailable(wallets[3], [])).toBe(true);
    expect(permissionService.isCreateMultisigTxAvailable(wallets[4], [])).toBe(true);
    expect(permissionService.isCreateMultisigTxAvailable(wallets[5], [])).toBe(true);
    expect(permissionService.isCreateMultisigTxAvailable(wallets[6], [])).toBe(false);
  });

  it('should return correct values for approve multisig tx available for all wallets', () => {
    expect(permissionService.isApproveMultisigTxAvailable(wallets[0], [])).toBe(false);
    expect(permissionService.isApproveMultisigTxAvailable(wallets[1], [])).toBe(true);
    expect(permissionService.isApproveMultisigTxAvailable(wallets[2], [])).toBe(true);
    expect(permissionService.isApproveMultisigTxAvailable(wallets[3], [])).toBe(true);
    expect(permissionService.isApproveMultisigTxAvailable(wallets[4], [])).toBe(true);
    expect(permissionService.isApproveMultisigTxAvailable(wallets[5], [])).toBe(true);
    expect(permissionService.isApproveMultisigTxAvailable(wallets[6], [])).toBe(false);
  });

  it('should return correct values for reject multisig tx available for all wallets', () => {
    expect(permissionService.isRejectMultisigTxAvailable(wallets[0], [])).toBe(false);
    expect(permissionService.isRejectMultisigTxAvailable(wallets[1], [])).toBe(true);
    expect(permissionService.isRejectMultisigTxAvailable(wallets[2], [])).toBe(true);
    expect(permissionService.isRejectMultisigTxAvailable(wallets[3], [])).toBe(true);
    expect(permissionService.isRejectMultisigTxAvailable(wallets[4], [])).toBe(true);
    expect(permissionService.isRejectMultisigTxAvailable(wallets[5], [])).toBe(true);
    expect(permissionService.isRejectMultisigTxAvailable(wallets[6], [])).toBe(false);
  });

  it('should return correct values for create any proxy available for all wallets', () => {
    expect(permissionService.isCreateAnyProxyAvailable(wallets[0], [])).toBe(false);
    expect(permissionService.isCreateAnyProxyAvailable(wallets[1], [])).toBe(true);
    expect(permissionService.isCreateAnyProxyAvailable(wallets[2], [])).toBe(true);
    expect(permissionService.isCreateAnyProxyAvailable(wallets[3], [])).toBe(true);
    expect(permissionService.isCreateAnyProxyAvailable(wallets[4], [])).toBe(true);
    expect(permissionService.isCreateAnyProxyAvailable(wallets[5], [])).toBe(true);
    expect(permissionService.isCreateAnyProxyAvailable(wallets[6], [])).toBe(true);
  });

  it('should return correct values for create non any proxy available for all wallets', () => {
    expect(permissionService.isCreateNonAnyProxyAvailable(wallets[0], [])).toBe(false);
    expect(permissionService.isCreateNonAnyProxyAvailable(wallets[1], [])).toBe(true);
    expect(permissionService.isCreateNonAnyProxyAvailable(wallets[2], [])).toBe(true);
    expect(permissionService.isCreateNonAnyProxyAvailable(wallets[3], [])).toBe(true);
    expect(permissionService.isCreateNonAnyProxyAvailable(wallets[4], [])).toBe(true);
    expect(permissionService.isCreateNonAnyProxyAvailable(wallets[5], [])).toBe(true);
    expect(permissionService.isCreateNonAnyProxyAvailable(wallets[6], [])).toBe(true);
  });

  it('should return correct values for remove proxy available for all wallets', () => {
    expect(permissionService.isRemoveProxyAvailable(wallets[0], [])).toBe(false);
    expect(permissionService.isRemoveProxyAvailable(wallets[1], [])).toBe(true);
    expect(permissionService.isRemoveProxyAvailable(wallets[2], [])).toBe(true);
    expect(permissionService.isRemoveProxyAvailable(wallets[3], [])).toBe(true);
    expect(permissionService.isRemoveProxyAvailable(wallets[4], [])).toBe(true);
    expect(permissionService.isRemoveProxyAvailable(wallets[5], [])).toBe(true);
    expect(permissionService.isRemoveProxyAvailable(wallets[6], [])).toBe(true);
  });

  it('should return correct values for transfer available for all types of proxied wallet', () => {
    expect(permissionService.isTransferAvailable(proxiedWallet, [accounts[0]])).toBe(true);
    expect(permissionService.isTransferAvailable(proxiedWallet, [accounts[1]])).toBe(false);
    expect(permissionService.isTransferAvailable(proxiedWallet, [accounts[2]])).toBe(false);
    expect(permissionService.isTransferAvailable(proxiedWallet, [accounts[3]])).toBe(false);
    expect(permissionService.isTransferAvailable(proxiedWallet, [accounts[4]])).toBe(false);
    expect(permissionService.isTransferAvailable(proxiedWallet, [accounts[5]])).toBe(false);
    expect(permissionService.isTransferAvailable(proxiedWallet, [accounts[6]])).toBe(false);
    expect(permissionService.isTransferAvailable(proxiedWallet, [accounts[7]])).toBe(false);
  });

  it('should return correct values for staking available for all types of proxied wallet', () => {
    expect(permissionService.isStakingAvailable(proxiedWallet, [accounts[0]])).toBe(true);
    expect(permissionService.isStakingAvailable(proxiedWallet, [accounts[1]])).toBe(true);
    expect(permissionService.isStakingAvailable(proxiedWallet, [accounts[2]])).toBe(true);
    expect(permissionService.isStakingAvailable(proxiedWallet, [accounts[3]])).toBe(false);
    expect(permissionService.isStakingAvailable(proxiedWallet, [accounts[4]])).toBe(false);
    expect(permissionService.isStakingAvailable(proxiedWallet, [accounts[5]])).toBe(false);
    expect(permissionService.isStakingAvailable(proxiedWallet, [accounts[6]])).toBe(false);
    expect(permissionService.isStakingAvailable(proxiedWallet, [accounts[7]])).toBe(false);
  });

  it('should return correct values for create multisig tx available for all types of proxied wallet', () => {
    expect(permissionService.isCreateMultisigTxAvailable(proxiedWallet, [accounts[0]])).toBe(true);
    expect(permissionService.isCreateMultisigTxAvailable(proxiedWallet, [accounts[1]])).toBe(true);
    expect(permissionService.isCreateMultisigTxAvailable(proxiedWallet, [accounts[2]])).toBe(false);
    expect(permissionService.isCreateMultisigTxAvailable(proxiedWallet, [accounts[3]])).toBe(false);
    expect(permissionService.isCreateMultisigTxAvailable(proxiedWallet, [accounts[4]])).toBe(false);
    expect(permissionService.isCreateMultisigTxAvailable(proxiedWallet, [accounts[5]])).toBe(false);
    expect(permissionService.isCreateMultisigTxAvailable(proxiedWallet, [accounts[6]])).toBe(false);
    expect(permissionService.isCreateMultisigTxAvailable(proxiedWallet, [accounts[7]])).toBe(false);
  });

  it('should return correct values for approve multisig tx available for all types of proxied wallet', () => {
    expect(permissionService.isApproveMultisigTxAvailable(proxiedWallet, [accounts[0]])).toBe(true);
    expect(permissionService.isApproveMultisigTxAvailable(proxiedWallet, [accounts[1]])).toBe(true);
    expect(permissionService.isApproveMultisigTxAvailable(proxiedWallet, [accounts[2]])).toBe(false);
    expect(permissionService.isApproveMultisigTxAvailable(proxiedWallet, [accounts[3]])).toBe(false);
    expect(permissionService.isApproveMultisigTxAvailable(proxiedWallet, [accounts[4]])).toBe(false);
    expect(permissionService.isApproveMultisigTxAvailable(proxiedWallet, [accounts[5]])).toBe(false);
    expect(permissionService.isApproveMultisigTxAvailable(proxiedWallet, [accounts[6]])).toBe(false);
    expect(permissionService.isApproveMultisigTxAvailable(proxiedWallet, [accounts[7]])).toBe(false);
  });

  it('should return correct values for reject multisig tx available for all types of proxied wallet', () => {
    expect(permissionService.isRejectMultisigTxAvailable(proxiedWallet, [accounts[0]])).toBe(true);
    expect(permissionService.isRejectMultisigTxAvailable(proxiedWallet, [accounts[1]])).toBe(true);
    expect(permissionService.isRejectMultisigTxAvailable(proxiedWallet, [accounts[2]])).toBe(false);
    expect(permissionService.isRejectMultisigTxAvailable(proxiedWallet, [accounts[3]])).toBe(false);
    expect(permissionService.isRejectMultisigTxAvailable(proxiedWallet, [accounts[4]])).toBe(false);
    expect(permissionService.isRejectMultisigTxAvailable(proxiedWallet, [accounts[5]])).toBe(false);
    expect(permissionService.isRejectMultisigTxAvailable(proxiedWallet, [accounts[6]])).toBe(false);
    expect(permissionService.isRejectMultisigTxAvailable(proxiedWallet, [accounts[7]])).toBe(false);
  });

  it('should return correct values for create any proxy available for all types of proxied wallet', () => {
    expect(permissionService.isCreateAnyProxyAvailable(proxiedWallet, [accounts[0]])).toBe(true);
    expect(permissionService.isCreateAnyProxyAvailable(proxiedWallet, [accounts[1]])).toBe(false);
    expect(permissionService.isCreateAnyProxyAvailable(proxiedWallet, [accounts[2]])).toBe(false);
    expect(permissionService.isCreateAnyProxyAvailable(proxiedWallet, [accounts[3]])).toBe(false);
    expect(permissionService.isCreateAnyProxyAvailable(proxiedWallet, [accounts[4]])).toBe(false);
    expect(permissionService.isCreateAnyProxyAvailable(proxiedWallet, [accounts[5]])).toBe(false);
    expect(permissionService.isCreateAnyProxyAvailable(proxiedWallet, [accounts[6]])).toBe(false);
    expect(permissionService.isCreateAnyProxyAvailable(proxiedWallet, [accounts[7]])).toBe(false);
  });

  it('should return correct values for create non any proxy available for all types of proxied wallet', () => {
    expect(permissionService.isCreateNonAnyProxyAvailable(proxiedWallet, [accounts[0]])).toBe(true);
    expect(permissionService.isCreateNonAnyProxyAvailable(proxiedWallet, [accounts[1]])).toBe(true);
    expect(permissionService.isCreateNonAnyProxyAvailable(proxiedWallet, [accounts[2]])).toBe(false);
    expect(permissionService.isCreateNonAnyProxyAvailable(proxiedWallet, [accounts[3]])).toBe(false);
    expect(permissionService.isCreateNonAnyProxyAvailable(proxiedWallet, [accounts[4]])).toBe(false);
    expect(permissionService.isCreateNonAnyProxyAvailable(proxiedWallet, [accounts[5]])).toBe(false);
    expect(permissionService.isCreateNonAnyProxyAvailable(proxiedWallet, [accounts[6]])).toBe(false);
    expect(permissionService.isCreateNonAnyProxyAvailable(proxiedWallet, [accounts[7]])).toBe(false);
  });

  it('should return correct values for remove proxy available for all types of proxied wallet', () => {
    expect(permissionService.isRemoveProxyAvailable(proxiedWallet, [accounts[0]])).toBe(true);
    expect(permissionService.isRemoveProxyAvailable(proxiedWallet, [accounts[1]])).toBe(true);
    expect(permissionService.isRemoveProxyAvailable(proxiedWallet, [accounts[2]])).toBe(false);
    expect(permissionService.isRemoveProxyAvailable(proxiedWallet, [accounts[3]])).toBe(false);
    expect(permissionService.isRemoveProxyAvailable(proxiedWallet, [accounts[4]])).toBe(false);
    expect(permissionService.isRemoveProxyAvailable(proxiedWallet, [accounts[5]])).toBe(false);
    expect(permissionService.isRemoveProxyAvailable(proxiedWallet, [accounts[6]])).toBe(false);
    expect(permissionService.isRemoveProxyAvailable(proxiedWallet, [accounts[7]])).toBe(false);
  });
});
