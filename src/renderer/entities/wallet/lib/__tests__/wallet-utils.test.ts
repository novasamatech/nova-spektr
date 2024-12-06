import { type Wallet, WalletType } from '@/shared/core';
import { walletUtils } from '../wallet-utils';

describe('entities/wallet/lib/wallet-utils', () => {
  test('isPolkadotVault should return true if wallet type is PolkadotVault', () => {
    const wallet = { type: WalletType.POLKADOT_VAULT } as Wallet;

    expect(walletUtils.isPolkadotVault(wallet)).toEqual(true);
  });

  test('isPolkadotVault should return false if wallet type is not PolkadotVault', () => {
    const wallet = { type: WalletType.NOVA_WALLET } as Wallet;

    expect(walletUtils.isPolkadotVault(wallet)).toEqual(false);
  });

  test('isMultiShard should return true when wallet type is MultiShard', () => {
    const wallet = { type: WalletType.MULTISHARD_PARITY_SIGNER } as Wallet;

    expect(walletUtils.isMultiShard(wallet)).toEqual(true);
  });

  test('isMultiShard should return false when wallet type is not MultiShard', () => {
    const wallet = { type: WalletType.NOVA_WALLET } as Wallet;

    expect(walletUtils.isMultiShard(wallet)).toEqual(false);
  });

  test('isMultisig should return true when wallet type is Multisig', () => {
    const wallet = { type: WalletType.MULTISIG } as Wallet;

    expect(walletUtils.isRegularMultisig(wallet)).toEqual(true);
  });

  test('isFlexibleMultisig should return true when wallet type is Flexible Multisig', () => {
    const wallet = { type: WalletType.FLEXIBLE_MULTISIG } as Wallet;

    expect(walletUtils.isFlexibleMultisig(wallet)).toEqual(true);
  });

  test('isMultisig should return true when wallet type is Flexible Multisig', () => {
    const wallet = { type: WalletType.FLEXIBLE_MULTISIG } as Wallet;

    expect(walletUtils.isMultisig(wallet)).toEqual(true);
  });

  test('isMultisig should return false when wallet type is not Multisig', () => {
    const wallet = { type: WalletType.NOVA_WALLET } as Wallet;

    expect(walletUtils.isRegularMultisig(wallet)).toEqual(false);
  });

  test('isNovaWallet should return true when wallet type is NovaWallet', () => {
    const wallet = { type: WalletType.NOVA_WALLET } as Wallet;

    expect(walletUtils.isNovaWallet(wallet)).toEqual(true);
  });

  test('isNovaWallet should return false when wallet type is not NovaWallet', () => {
    const wallet = { type: WalletType.POLKADOT_VAULT } as Wallet;

    expect(walletUtils.isRegularMultisig(wallet)).toEqual(false);
  });

  test('isProxied should return true when wallet type is Proxied', () => {
    const wallet = { type: WalletType.PROXIED } as Wallet;

    expect(walletUtils.isProxied(wallet)).toEqual(true);
  });

  test('isProxied should return false when wallet type is not Proxied', () => {
    const wallet = { type: WalletType.POLKADOT_VAULT } as Wallet;

    expect(walletUtils.isProxied(wallet)).toEqual(false);
  });

  test('isSingleShard should return true when wallet type is SingleShard', () => {
    const wallet = { type: WalletType.SINGLE_PARITY_SIGNER } as Wallet;

    expect(walletUtils.isSingleShard(wallet)).toEqual(true);
  });

  test('isSingleShard should return false when wallet type is not SingleShard', () => {
    const wallet = { type: WalletType.POLKADOT_VAULT } as Wallet;

    expect(walletUtils.isSingleShard(wallet)).toEqual(false);
  });

  test('isWalletConnect should return true when wallet type is WALLET_CONNECT', () => {
    const wallet = { type: WalletType.WALLET_CONNECT } as Wallet;

    expect(walletUtils.isWalletConnect(wallet)).toEqual(true);
  });

  test('isWalletConnect should return false when wallet type is not WALLET_CONNECT', () => {
    const wallet = { type: WalletType.POLKADOT_VAULT } as Wallet;

    expect(walletUtils.isWalletConnect(wallet)).toEqual(false);
  });

  test('isWatchOnly should return true when wallet type is WATCH_ONLY', () => {
    const wallet = { type: WalletType.WATCH_ONLY } as Wallet;

    expect(walletUtils.isWatchOnly(wallet)).toEqual(true);
  });

  test('isWatchOnly should return false when wallet type is not WATCH_ONLY', () => {
    const wallet = { type: WalletType.POLKADOT_VAULT } as Wallet;

    expect(walletUtils.isWatchOnly(wallet)).toEqual(false);
  });

  test('isWalletConnectGroup should return true when wallet type is in wallet connect group', () => {
    const walletConnect = { type: WalletType.WALLET_CONNECT } as Wallet;
    const novaWallet = { type: WalletType.NOVA_WALLET } as Wallet;

    expect(walletUtils.isWalletConnectGroup(walletConnect)).toEqual(true);
    expect(walletUtils.isWalletConnectGroup(novaWallet)).toEqual(true);
  });

  test('isWalletConnectGroup should return true when wallet type is in wallet connect group', () => {
    const singleshard = { type: WalletType.SINGLE_PARITY_SIGNER } as Wallet;
    const multishard = { type: WalletType.MULTISHARD_PARITY_SIGNER } as Wallet;
    const polkadotVault = { type: WalletType.POLKADOT_VAULT } as Wallet;

    expect(walletUtils.isPolkadotVaultGroup(singleshard)).toEqual(true);
    expect(walletUtils.isPolkadotVaultGroup(multishard)).toEqual(true);
    expect(walletUtils.isPolkadotVaultGroup(polkadotVault)).toEqual(true);
  });

  test('isWatchOnly should return false when wallet type is not WATCH_ONLY', () => {
    const wallet = { type: WalletType.POLKADOT_VAULT } as Wallet;

    expect(walletUtils.isWatchOnly(wallet)).toEqual(false);
  });

  test('isValidSignatory returns false if wallet is not provided', () => {
    const result = walletUtils.isValidSignatory();

    expect(result).toEqual(false);
  });

  test('isValidSignatory returns false if wallet type is not in the valid signatory wallet types', () => {
    const wallet = { type: WalletType.MULTISIG } as Wallet;
    const result = walletUtils.isValidSignatory(wallet);

    expect(result).toEqual(false);
  });

  test('isValidSignatory returns true if wallet type is in the valid signatory wallet types', () => {
    const wallet = { type: WalletType.SINGLE_PARITY_SIGNER } as Wallet;
    const result = walletUtils.isValidSignatory(wallet);

    expect(result).toEqual(true);
  });

  test('getWalletById should return the correct wallet when found', () => {
    const wallets = [
      { id: 1, name: 'Wallet 1' },
      { id: 2, name: 'Wallet 2' },
      { id: 3, name: 'Wallet 3' },
    ] as Wallet[];

    expect(walletUtils.getWalletById(wallets, 2)).toEqual({ id: 2, name: 'Wallet 2' });
  });

  test('getWalletById should return undefined when wallet not found', () => {
    const wallets = [
      { id: 1, name: 'Wallet 1' },
      { id: 2, name: 'Wallet 2' },
      { id: 3, name: 'Wallet 3' },
    ] as Wallet[];

    expect(walletUtils.getWalletById(wallets, 4)).toBeUndefined();
  });
});
