import {
  AccountType,
  MultiShardWallet,
  MultisigWallet,
  NovaWalletWallet,
  PolkadotVaultWallet,
  ProxiedAccount,
  ProxiedWallet,
  ProxyType,
  SingleShardWallet,
  WalletConnectWallet,
  WalletType,
  WatchOnlyWallet,
} from '@shared/core';
import { permissionUtils } from '../permission-utils';

const watchOnlyWallet = {
  name: 'watch only wallet',
  type: WalletType.WATCH_ONLY,
} as WatchOnlyWallet;
const vaultWallet = {
  name: 'polkadot vault wallet',
  type: WalletType.POLKADOT_VAULT,
} as PolkadotVaultWallet;
const novaWallet = {
  name: 'nova wallet',
  type: WalletType.NOVA_WALLET,
} as NovaWalletWallet;
const walletConnectWallet = {
  name: 'wallet connect',
  type: WalletType.WALLET_CONNECT,
} as WalletConnectWallet;
const singleParitySignerWallet = {
  name: 'single parity signer wallet',
  type: WalletType.SINGLE_PARITY_SIGNER,
} as SingleShardWallet;
const multishardWallet = {
  name: 'multishard wallet',
  type: WalletType.MULTISHARD_PARITY_SIGNER,
} as MultiShardWallet;
const multisigWallet = {
  name: 'multisig wallet',
  type: WalletType.MULTISIG,
} as MultisigWallet;
const proxiedWallet = {
  name: 'proxied wallet',
  type: WalletType.PROXIED,
} as ProxiedWallet;

const anyProxyAccount = {
  type: AccountType.PROXIED,
  proxyType: ProxyType.ANY,
} as ProxiedAccount;

const nonTransferProxyAccount = {
  type: AccountType.PROXIED,
  proxyType: ProxyType.NON_TRANSFER,
} as ProxiedAccount;

const stakingProxyAccount = {
  type: AccountType.PROXIED,
  proxyType: ProxyType.STAKING,
} as ProxiedAccount;

const auctionProxyAccount = {
  type: AccountType.PROXIED,
  proxyType: ProxyType.AUCTION,
} as ProxiedAccount;

const cancelProxyAccount = {
  type: AccountType.PROXIED,
  proxyType: ProxyType.CANCEL_PROXY,
} as ProxiedAccount;

const governanceProxyAccount = {
  type: AccountType.PROXIED,
  proxyType: ProxyType.GOVERNANCE,
} as ProxiedAccount;

const identityJudgementProxyAccount = {
  type: AccountType.PROXIED,
  proxyType: ProxyType.IDENTITY_JUDGEMENT,
} as ProxiedAccount;

const nominationPoolsProxyAccount = {
  type: AccountType.PROXIED,
  proxyType: ProxyType.NOMINATION_POOLS,
} as ProxiedAccount;

export const tests = [
  {
    testName: 'should return correct values for transfer available for watchOnlyWallet',

    wallet: watchOnlyWallet,
    accounts: [],
    result: false,
    method: permissionUtils.canTransfer,
  },
  {
    testName: 'should return correct values for transfer available for vaultWallet',

    wallet: vaultWallet,
    accounts: [],
    result: true,
    method: permissionUtils.canTransfer,
  },
  {
    testName: 'should return correct values for transfer available for novaWallet',

    wallet: novaWallet,
    accounts: [],
    result: true,
    method: permissionUtils.canTransfer,
  },
  {
    testName: 'should return correct values for transfer available for walletConnectWallet',

    wallet: walletConnectWallet,
    accounts: [],
    result: true,
    method: permissionUtils.canTransfer,
  },
  {
    testName: 'should return correct values for transfer available for singleParitySignerWallet',

    wallet: singleParitySignerWallet,
    accounts: [],
    result: true,
    method: permissionUtils.canTransfer,
  },
  {
    testName: 'should return correct values for transfer available for multishardWallet',

    wallet: multishardWallet,
    accounts: [],
    result: true,
    method: permissionUtils.canTransfer,
  },
  {
    testName: 'should return correct values for transfer available for multisigWallet',

    wallet: multisigWallet,
    accounts: [],
    result: true,
    method: permissionUtils.canTransfer,
  },
  {
    testName: 'should return correct values for transfer available for anyProxyAccount',

    wallet: proxiedWallet,
    accounts: [anyProxyAccount],
    result: true,
    method: permissionUtils.canTransfer,
  },
  {
    testName: 'should return correct values for transfer available for nonTransferProxyAccount',

    wallet: proxiedWallet,
    accounts: [nonTransferProxyAccount],
    result: false,
    method: permissionUtils.canTransfer,
  },
  {
    testName: 'should return correct values for transfer available for stakingProxyAccount',

    wallet: proxiedWallet,
    accounts: [stakingProxyAccount],
    result: false,
    method: permissionUtils.canTransfer,
  },
  {
    testName: 'should return correct values for transfer available for auctionProxyAccount',

    wallet: proxiedWallet,
    accounts: [auctionProxyAccount],
    result: false,
    method: permissionUtils.canTransfer,
  },
  {
    testName: 'should return correct values for transfer available for cancelProxyAccount',

    wallet: proxiedWallet,
    accounts: [cancelProxyAccount],
    result: false,
    method: permissionUtils.canTransfer,
  },
  {
    testName: 'should return correct values for transfer available for governanceProxyAccount',

    wallet: proxiedWallet,
    accounts: [governanceProxyAccount],
    result: false,
    method: permissionUtils.canTransfer,
  },
  {
    testName: 'should return correct values for transfer available for identityJudgementProxyAccount',

    wallet: proxiedWallet,
    accounts: [identityJudgementProxyAccount],
    result: false,
    method: permissionUtils.canTransfer,
  },
  {
    testName: 'should return correct values for transfer available for nominationPoolsProxyAccount',
    wallet: proxiedWallet,
    accounts: [nominationPoolsProxyAccount],
    result: false,
    method: permissionUtils.canTransfer,
  },
  {
    testName: 'should return correct values for receive available for watch-only wallet',
    wallet: watchOnlyWallet,
    accounts: [],
    result: false,
    method: permissionUtils.canReceive,
  },
  {
    testName: 'should return correct values for receive available for vaultWallet',

    wallet: vaultWallet,
    accounts: [],
    result: true,
    method: permissionUtils.canReceive,
  },
  {
    testName: 'should return correct values for receive available for novaWallet',

    wallet: novaWallet,
    accounts: [],
    result: true,
    method: permissionUtils.canReceive,
  },
  {
    testName: 'should return correct values for receive available for walletConnectWallet',

    wallet: walletConnectWallet,
    accounts: [],
    result: true,
    method: permissionUtils.canReceive,
  },
  {
    testName: 'should return correct values for receive available for singleParitySignerWallet',

    wallet: singleParitySignerWallet,
    accounts: [],
    result: true,
    method: permissionUtils.canReceive,
  },
  {
    testName: 'should return correct values for receive available for multishardWallet',

    wallet: multishardWallet,
    accounts: [],
    result: true,
    method: permissionUtils.canReceive,
  },
  {
    testName: 'should return correct values for receive available for multisigWallet',

    wallet: multisigWallet,
    accounts: [],
    result: true,
    method: permissionUtils.canReceive,
  },
  {
    testName: 'should return correct values for receive available for proxiedWallet',

    wallet: proxiedWallet,
    accounts: [],
    result: true,
    method: permissionUtils.canReceive,
  },
  {
    testName: 'should return correct values for stake available for watchOnlyWallet',

    wallet: watchOnlyWallet,
    accounts: [],
    result: false,
    method: permissionUtils.canStake,
  },
  {
    testName: 'should return correct values for stake available for vaultWallet',

    wallet: vaultWallet,
    accounts: [],
    result: true,
    method: permissionUtils.canStake,
  },
  {
    testName: 'should return correct values for stake available for novaWallet',

    wallet: novaWallet,
    accounts: [],
    result: true,
    method: permissionUtils.canStake,
  },
  {
    testName: 'should return correct values for stake available for walletConnectWallet',

    wallet: walletConnectWallet,
    accounts: [],
    result: true,
    method: permissionUtils.canStake,
  },
  {
    testName: 'should return correct values for stake available for singleParitySignerWallet',

    wallet: singleParitySignerWallet,
    accounts: [],
    result: true,
    method: permissionUtils.canStake,
  },
  {
    testName: 'should return correct values for stake available for multishardWallet',

    wallet: multishardWallet,
    accounts: [],
    result: true,
    method: permissionUtils.canStake,
  },
  {
    testName: 'should return correct values for stake available for multisigWallet',

    wallet: multisigWallet,
    accounts: [],
    result: true,
    method: permissionUtils.canStake,
  },
  {
    testName: 'should return correct values for stake available for anyProxyAccount',

    wallet: proxiedWallet,
    accounts: [anyProxyAccount],
    result: true,
    method: permissionUtils.canStake,
  },
  {
    testName: 'should return correct values for stake available for nonTransferProxyAccount',

    wallet: proxiedWallet,
    accounts: [nonTransferProxyAccount],
    result: true,
    method: permissionUtils.canStake,
  },
  {
    testName: 'should return correct values for stake available for stakingProxyAccount',

    wallet: proxiedWallet,
    accounts: [stakingProxyAccount],
    result: true,
    method: permissionUtils.canStake,
  },
  {
    testName: 'should return correct values for stake available for auctionProxyAccount',

    wallet: proxiedWallet,
    accounts: [auctionProxyAccount],
    result: false,
    method: permissionUtils.canStake,
  },
  {
    testName: 'should return correct values for stake available for cancelProxyAccount',

    wallet: proxiedWallet,
    accounts: [cancelProxyAccount],
    result: false,
    method: permissionUtils.canStake,
  },
  {
    testName: 'should return correct values for stake available for governanceProxyAccount',

    wallet: proxiedWallet,
    accounts: [governanceProxyAccount],
    result: false,
    method: permissionUtils.canStake,
  },
  {
    testName: 'should return correct values for stake available for identityJudgementProxyAccount',

    wallet: proxiedWallet,
    accounts: [identityJudgementProxyAccount],
    result: false,
    method: permissionUtils.canStake,
  },
  {
    testName: 'should return correct values for stake available for nominationPoolsProxyAccount',

    wallet: proxiedWallet,
    accounts: [nominationPoolsProxyAccount],
    result: false,
    method: permissionUtils.canStake,
  },
  {
    testName: 'should return correct values for create multisig tx for watchOnlyWallet',
    wallet: watchOnlyWallet,
    accounts: [],
    result: false,
    method: permissionUtils.canCreateMultisigTx,
  },
  {
    testName: 'should return correct values for create multisig tx for vaultWallet',

    wallet: vaultWallet,
    accounts: [],
    result: true,
    method: permissionUtils.canCreateMultisigTx,
  },
  {
    testName: 'should return correct values for create multisig tx for novaWallet',

    wallet: novaWallet,
    accounts: [],
    result: true,
    method: permissionUtils.canCreateMultisigTx,
  },
  {
    testName: 'should return correct values for create multisig tx for walletConnectWallet',

    wallet: walletConnectWallet,
    accounts: [],
    result: true,
    method: permissionUtils.canCreateMultisigTx,
  },
  {
    testName: 'should return correct values for create multisig tx for singleParitySignerWallet',

    wallet: singleParitySignerWallet,
    accounts: [],
    result: true,
    method: permissionUtils.canCreateMultisigTx,
  },
  {
    testName: 'should return correct values for create multisig tx for multishardWallet',

    wallet: multishardWallet,
    accounts: [],
    result: true,
    method: permissionUtils.canCreateMultisigTx,
  },
  {
    testName: 'should return correct values for create multisig tx for multisigWallet',

    wallet: multisigWallet,
    accounts: [],
    result: false,
    method: permissionUtils.canCreateMultisigTx,
  },
  {
    testName: 'should return correct values for create multisig tx for anyProxyAccount',

    wallet: proxiedWallet,
    accounts: [anyProxyAccount],
    result: true,
    method: permissionUtils.canCreateMultisigTx,
  },
  {
    testName: 'should return correct values for create multisig tx for nonTransferProxyAccount',

    wallet: proxiedWallet,
    accounts: [nonTransferProxyAccount],
    result: true,
    method: permissionUtils.canCreateMultisigTx,
  },
  {
    testName: 'should return correct values for create multisig tx for stakingProxyAccount',

    wallet: proxiedWallet,
    accounts: [stakingProxyAccount],
    result: false,
    method: permissionUtils.canCreateMultisigTx,
  },
  {
    testName: 'should return correct values for create multisig tx for auctionProxyAccount',

    wallet: proxiedWallet,
    accounts: [auctionProxyAccount],
    result: false,
    method: permissionUtils.canCreateMultisigTx,
  },
  {
    testName: 'should return correct values for create multisig tx for cancelProxyAccount',

    wallet: proxiedWallet,
    accounts: [cancelProxyAccount],
    result: false,
    method: permissionUtils.canCreateMultisigTx,
  },
  {
    testName: 'should return correct values for create multisig tx for governanceProxyAccount',

    wallet: proxiedWallet,
    accounts: [governanceProxyAccount],
    result: false,
    method: permissionUtils.canCreateMultisigTx,
  },
  {
    testName: 'should return correct values for create multisig tx for identityJudgementProxyAccount',

    wallet: proxiedWallet,
    accounts: [identityJudgementProxyAccount],
    result: false,
    method: permissionUtils.canCreateMultisigTx,
  },
  {
    testName: 'should return correct values for create multisig tx for nominationPoolsProxyAccount',

    wallet: proxiedWallet,
    accounts: [nominationPoolsProxyAccount],
    result: false,
    method: permissionUtils.canCreateMultisigTx,
  },
  {
    testName: 'should return correct values for approve multisig tx for watchOnlyWallet',
    wallet: watchOnlyWallet,
    accounts: [],
    result: false,
    method: permissionUtils.canApproveMultisigTx,
  },
  {
    testName: 'should return correct values for approve multisig tx for vaultWallet',

    wallet: vaultWallet,
    accounts: [],
    result: true,
    method: permissionUtils.canApproveMultisigTx,
  },
  {
    testName: 'should return correct values for approve multisig tx for novaWallet',

    wallet: novaWallet,
    accounts: [],
    result: true,
    method: permissionUtils.canApproveMultisigTx,
  },
  {
    testName: 'should return correct values for approve multisig tx for walletConnectWallet',

    wallet: walletConnectWallet,
    accounts: [],
    result: true,
    method: permissionUtils.canApproveMultisigTx,
  },
  {
    testName: 'should return correct values for approve multisig tx for singleParitySignerWallet',

    wallet: singleParitySignerWallet,
    accounts: [],
    result: true,
    method: permissionUtils.canApproveMultisigTx,
  },
  {
    testName: 'should return correct values for approve multisig tx for multishardWallet',

    wallet: multishardWallet,
    accounts: [],
    result: true,
    method: permissionUtils.canApproveMultisigTx,
  },
  {
    testName: 'should return correct values for approve multisig tx for multisigWallet',

    wallet: multisigWallet,
    accounts: [],
    result: false,
    method: permissionUtils.canApproveMultisigTx,
  },
  {
    testName: 'should return correct values for approve multisig tx for anyProxyAccount',

    wallet: proxiedWallet,
    accounts: [anyProxyAccount],
    result: true,
    method: permissionUtils.canApproveMultisigTx,
  },
  {
    testName: 'should return correct values for approve multisig tx for nonTransferProxyAccount',

    wallet: proxiedWallet,
    accounts: [nonTransferProxyAccount],
    result: true,
    method: permissionUtils.canApproveMultisigTx,
  },
  {
    testName: 'should return correct values for approve multisig tx for stakingProxyAccount',

    wallet: proxiedWallet,
    accounts: [stakingProxyAccount],
    result: false,
    method: permissionUtils.canApproveMultisigTx,
  },
  {
    testName: 'should return correct values for approve multisig tx for auctionProxyAccount',

    wallet: proxiedWallet,
    accounts: [auctionProxyAccount],
    result: false,
    method: permissionUtils.canApproveMultisigTx,
  },
  {
    testName: 'should return correct values for approve multisig tx for cancelProxyAccount',

    wallet: proxiedWallet,
    accounts: [cancelProxyAccount],
    result: false,
    method: permissionUtils.canApproveMultisigTx,
  },
  {
    testName: 'should return correct values for approve multisig tx for governanceProxyAccount',

    wallet: proxiedWallet,
    accounts: [governanceProxyAccount],
    result: false,
    method: permissionUtils.canApproveMultisigTx,
  },
  {
    testName: 'should return correct values for approve multisig tx for identityJudgementProxyAccount',

    wallet: proxiedWallet,
    accounts: [identityJudgementProxyAccount],
    result: false,
    method: permissionUtils.canApproveMultisigTx,
  },
  {
    testName: 'should return correct values for approve multisig tx for nominationPoolsProxyAccount',

    wallet: proxiedWallet,
    accounts: [nominationPoolsProxyAccount],
    result: false,
    method: permissionUtils.canApproveMultisigTx,
  },
  {
    testName: 'should return correct values for reject multisig tx for watchOnlyWallet',
    wallet: watchOnlyWallet,
    accounts: [],
    result: false,
    method: permissionUtils.canRejectMultisigTx,
  },
  {
    testName: 'should return correct values for reject multisig tx for vaultWallet',

    wallet: vaultWallet,
    accounts: [],
    result: true,
    method: permissionUtils.canRejectMultisigTx,
  },
  {
    testName: 'should return correct values for reject multisig tx for novaWallet',

    wallet: novaWallet,
    accounts: [],
    result: true,
    method: permissionUtils.canRejectMultisigTx,
  },
  {
    testName: 'should return correct values for reject multisig tx for walletConnectWallet',

    wallet: walletConnectWallet,
    accounts: [],
    result: true,
    method: permissionUtils.canRejectMultisigTx,
  },
  {
    testName: 'should return correct values for reject multisig tx for singleParitySignerWallet',

    wallet: singleParitySignerWallet,
    accounts: [],
    result: true,
    method: permissionUtils.canRejectMultisigTx,
  },
  {
    testName: 'should return correct values for reject multisig tx for multishardWallet',

    wallet: multishardWallet,
    accounts: [],
    result: true,
    method: permissionUtils.canRejectMultisigTx,
  },
  {
    testName: 'should return correct values for reject multisig tx for multisigWallet',

    wallet: multisigWallet,
    accounts: [],
    result: false,
    method: permissionUtils.canRejectMultisigTx,
  },
  {
    testName: 'should return correct values for reject multisig tx for anyProxyAccount',

    wallet: proxiedWallet,
    accounts: [anyProxyAccount],
    result: true,
    method: permissionUtils.canRejectMultisigTx,
  },
  {
    testName: 'should return correct values for reject multisig tx for nonTransferProxyAccount',

    wallet: proxiedWallet,
    accounts: [nonTransferProxyAccount],
    result: true,
    method: permissionUtils.canRejectMultisigTx,
  },
  {
    testName: 'should return correct values for reject multisig tx for stakingProxyAccount',

    wallet: proxiedWallet,
    accounts: [stakingProxyAccount],
    result: false,
    method: permissionUtils.canRejectMultisigTx,
  },
  {
    testName: 'should return correct values for reject multisig tx for auctionProxyAccount',

    wallet: proxiedWallet,
    accounts: [auctionProxyAccount],
    result: false,
    method: permissionUtils.canRejectMultisigTx,
  },
  {
    testName: 'should return correct values for reject multisig tx for cancelProxyAccount',

    wallet: proxiedWallet,
    accounts: [cancelProxyAccount],
    result: false,
    method: permissionUtils.canRejectMultisigTx,
  },
  {
    testName: 'should return correct values for reject multisig tx for governanceProxyAccount',

    wallet: proxiedWallet,
    accounts: [governanceProxyAccount],
    result: false,
    method: permissionUtils.canRejectMultisigTx,
  },
  {
    testName: 'should return correct values for reject multisig tx for identityJudgementProxyAccount',

    wallet: proxiedWallet,
    accounts: [identityJudgementProxyAccount],
    result: false,
    method: permissionUtils.canRejectMultisigTx,
  },
  {
    testName: 'should return correct values for reject multisig tx for nominationPoolsProxyAccount',

    wallet: proxiedWallet,
    accounts: [nominationPoolsProxyAccount],
    result: false,
    method: permissionUtils.canRejectMultisigTx,
  },
  {
    testName: 'should return correct values for create any proxy for watchOnlyWallet',

    wallet: watchOnlyWallet,
    accounts: [],
    result: false,
    method: permissionUtils.canCreateAnyProxy,
  },
  {
    testName: 'should return correct values for create any proxy for vaultWallet',

    wallet: vaultWallet,
    accounts: [],
    result: true,
    method: permissionUtils.canCreateAnyProxy,
  },
  {
    testName: 'should return correct values for create any proxy for novaWallet',

    wallet: novaWallet,
    accounts: [],
    result: true,
    method: permissionUtils.canCreateAnyProxy,
  },
  {
    testName: 'should return correct values for create any proxy for walletConnectWallet',

    wallet: walletConnectWallet,
    accounts: [],
    result: true,
    method: permissionUtils.canCreateAnyProxy,
  },
  {
    testName: 'should return correct values for create any proxy for singleParitySignerWallet',

    wallet: singleParitySignerWallet,
    accounts: [],
    result: true,
    method: permissionUtils.canCreateAnyProxy,
  },
  {
    testName: 'should return correct values for create any proxy for multishardWallet',

    wallet: multishardWallet,
    accounts: [],
    result: true,
    method: permissionUtils.canCreateAnyProxy,
  },
  {
    testName: 'should return correct values for create any proxy for multisigWallet',

    wallet: multisigWallet,
    accounts: [],
    result: true,
    method: permissionUtils.canCreateAnyProxy,
  },
  {
    testName: 'should return correct values for create any proxy for anyProxyAccount',

    wallet: proxiedWallet,
    accounts: [anyProxyAccount],
    result: true,
    method: permissionUtils.canCreateAnyProxy,
  },
  {
    testName: 'should return correct values for create any proxy for nonTransferProxyAccount',

    wallet: proxiedWallet,
    accounts: [nonTransferProxyAccount],
    result: false,
    method: permissionUtils.canCreateAnyProxy,
  },
  {
    testName: 'should return correct values for create any proxy for stakingProxyAccount',

    wallet: proxiedWallet,
    accounts: [stakingProxyAccount],
    result: false,
    method: permissionUtils.canCreateAnyProxy,
  },
  {
    testName: 'should return correct values for create any proxy for auctionProxyAccount',

    wallet: proxiedWallet,
    accounts: [auctionProxyAccount],
    result: false,
    method: permissionUtils.canCreateAnyProxy,
  },
  {
    testName: 'should return correct values for create any proxy for cancelProxyAccount',

    wallet: proxiedWallet,
    accounts: [cancelProxyAccount],
    result: false,
    method: permissionUtils.canCreateAnyProxy,
  },
  {
    testName: 'should return correct values for create any proxy for governanceProxyAccount',

    wallet: proxiedWallet,
    accounts: [governanceProxyAccount],
    result: false,
    method: permissionUtils.canCreateAnyProxy,
  },
  {
    testName: 'should return correct values for create any proxy for identityJudgementProxyAccount',

    wallet: proxiedWallet,
    accounts: [identityJudgementProxyAccount],
    result: false,
    method: permissionUtils.canCreateAnyProxy,
  },
  {
    testName: 'should return correct values for create any proxy for nominationPoolsProxyAccount',

    wallet: proxiedWallet,
    accounts: [nominationPoolsProxyAccount],
    result: false,
    method: permissionUtils.canCreateAnyProxy,
  },
  {
    testName: 'should return correct values for create non any proxy for watchOnlyWallet',

    wallet: watchOnlyWallet,
    accounts: [],
    result: false,
    method: permissionUtils.canCreateNonAnyProxy,
  },
  {
    testName: 'should return correct values for create non any proxy for vaultWallet',

    wallet: vaultWallet,
    accounts: [],
    result: true,
    method: permissionUtils.canCreateNonAnyProxy,
  },
  {
    testName: 'should return correct values for create non any proxy for novaWallet',

    wallet: novaWallet,
    accounts: [],
    result: true,
    method: permissionUtils.canCreateNonAnyProxy,
  },
  {
    testName: 'should return correct values for create non any proxy for walletConnectWallet',

    wallet: walletConnectWallet,
    accounts: [],
    result: true,
    method: permissionUtils.canCreateNonAnyProxy,
  },
  {
    testName: 'should return correct values for create non any proxy for singleParitySignerWallet',

    wallet: singleParitySignerWallet,
    accounts: [],
    result: true,
    method: permissionUtils.canCreateNonAnyProxy,
  },
  {
    testName: 'should return correct values for create non any proxy for multishardWallet',

    wallet: multishardWallet,
    accounts: [],
    result: true,
    method: permissionUtils.canCreateNonAnyProxy,
  },
  {
    testName: 'should return correct values for create non any proxy for multisigWallet',

    wallet: multisigWallet,
    accounts: [],
    result: true,
    method: permissionUtils.canCreateNonAnyProxy,
  },
  {
    testName: 'should return correct values for create non any proxy for anyProxyAccount',

    wallet: proxiedWallet,
    accounts: [anyProxyAccount],
    result: true,
    method: permissionUtils.canCreateNonAnyProxy,
  },
  {
    testName: 'should return correct values for create non any proxy for nonTransferProxyAccount',

    wallet: proxiedWallet,
    accounts: [nonTransferProxyAccount],
    result: true,
    method: permissionUtils.canCreateNonAnyProxy,
  },
  {
    testName: 'should return correct values for create non any proxy for stakingProxyAccount',

    wallet: proxiedWallet,
    accounts: [stakingProxyAccount],
    result: false,
    method: permissionUtils.canCreateNonAnyProxy,
  },
  {
    testName: 'should return correct values for create non any proxy for auctionProxyAccount',

    wallet: proxiedWallet,
    accounts: [auctionProxyAccount],
    result: false,
    method: permissionUtils.canCreateNonAnyProxy,
  },
  {
    testName: 'should return correct values for create non any proxy for cancelProxyAccount',

    wallet: proxiedWallet,
    accounts: [cancelProxyAccount],
    result: false,
    method: permissionUtils.canCreateNonAnyProxy,
  },
  {
    testName: 'should return correct values for create non any proxy for governanceProxyAccount',

    wallet: proxiedWallet,
    accounts: [governanceProxyAccount],
    result: false,
    method: permissionUtils.canCreateNonAnyProxy,
  },
  {
    testName: 'should return correct values for create non any proxy for identityJudgementProxyAccount',

    wallet: proxiedWallet,
    accounts: [identityJudgementProxyAccount],
    result: false,
    method: permissionUtils.canCreateNonAnyProxy,
  },
  {
    testName: 'should return correct values for create non any proxy for nominationPoolsProxyAccount',

    wallet: proxiedWallet,
    accounts: [nominationPoolsProxyAccount],
    result: false,
    method: permissionUtils.canCreateNonAnyProxy,
  },
  {
    testName: 'should return correct values for remove proxy for watchOnlyWallet',

    wallet: watchOnlyWallet,
    accounts: [],
    result: false,
    method: permissionUtils.canRemoveProxy,
  },
  {
    testName: 'should return correct values for remove proxy for vaultWallet',

    wallet: vaultWallet,
    accounts: [],
    result: true,
    method: permissionUtils.canRemoveProxy,
  },
  {
    testName: 'should return correct values for remove proxy for novaWallet',

    wallet: novaWallet,
    accounts: [],
    result: true,
    method: permissionUtils.canRemoveProxy,
  },
  {
    testName: 'should return correct values for remove proxy for walletConnectWallet',

    wallet: walletConnectWallet,
    accounts: [],
    result: true,
    method: permissionUtils.canRemoveProxy,
  },
  {
    testName: 'should return correct values for remove proxy for singleParitySignerWallet',

    wallet: singleParitySignerWallet,
    accounts: [],
    result: true,
    method: permissionUtils.canRemoveProxy,
  },
  {
    testName: 'should return correct values for remove proxy for multishardWallet',

    wallet: multishardWallet,
    accounts: [],
    result: true,
    method: permissionUtils.canRemoveProxy,
  },
  {
    testName: 'should return correct values for remove proxy for multisigWallet',

    wallet: multisigWallet,
    accounts: [],
    result: true,
    method: permissionUtils.canRemoveProxy,
  },
  {
    testName: 'should return correct values for remove proxy for anyProxyAccount',

    wallet: proxiedWallet,
    accounts: [anyProxyAccount],
    result: true,
    method: permissionUtils.canRemoveProxy,
  },
  {
    testName: 'should return correct values for remove proxy for nonTransferProxyAccount',

    wallet: proxiedWallet,
    accounts: [nonTransferProxyAccount],
    result: true,
    method: permissionUtils.canRemoveProxy,
  },
  {
    testName: 'should return correct values for remove proxy for stakingProxyAccount',

    wallet: proxiedWallet,
    accounts: [stakingProxyAccount],
    result: false,
    method: permissionUtils.canRemoveProxy,
  },
  {
    testName: 'should return correct values for remove proxy for auctionProxyAccount',

    wallet: proxiedWallet,
    accounts: [auctionProxyAccount],
    result: false,
    method: permissionUtils.canRemoveProxy,
  },
  {
    testName: 'should return correct values for remove proxy for cancelProxyAccount',

    wallet: proxiedWallet,
    accounts: [cancelProxyAccount],
    result: false,
    method: permissionUtils.canRemoveProxy,
  },
  {
    testName: 'should return correct values for remove proxy for governanceProxyAccount',

    wallet: proxiedWallet,
    accounts: [governanceProxyAccount],
    result: false,
    method: permissionUtils.canRemoveProxy,
  },
  {
    testName: 'should return correct values for remove proxy for identityJudgementProxyAccount',

    wallet: proxiedWallet,
    accounts: [identityJudgementProxyAccount],
    result: false,
    method: permissionUtils.canRemoveProxy,
  },
  {
    testName: 'should return correct values for remove proxy for nominationPoolsProxyAccount',

    wallet: proxiedWallet,
    accounts: [nominationPoolsProxyAccount],
    result: false,
    method: permissionUtils.canRemoveProxy,
  },
];
