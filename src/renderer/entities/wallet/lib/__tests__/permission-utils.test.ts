import { permissionUtils } from '../permission-utils';

import { permissionMocks } from './mocks/permission-mock';

describe('shared/api/permission/permission-utils', () => {
  const { wallets, accounts } = permissionMocks;

  describe('#canTransfer', () => {
    test.each([
      {
        testName: 'should return correct values for transfer available for watchOnlyWallet',
        wallet: wallets.watchOnlyWallet,
        result: false,
      },
      {
        testName: 'should return correct values for transfer available for vaultWallet',
        wallet: wallets.vaultWallet,
        result: true,
      },
      {
        testName: 'should return correct values for transfer available for novaWallet',
        wallet: wallets.novaWallet,
        result: true,
      },
      {
        testName: 'should return correct values for transfer available for walletConnectWallet',
        wallet: wallets.walletConnectWallet,
        result: true,
      },
      {
        testName: 'should return correct values for transfer available for singleParitySignerWallet',
        wallet: wallets.singleParitySignerWallet,
        result: true,
      },
      {
        testName: 'should return correct values for transfer available for multishardWallet',
        wallet: wallets.multishardWallet,
        result: true,
      },
      {
        testName: 'should return correct values for transfer available for multisigWallet',
        wallet: wallets.multisigWallet,
        result: true,
      },
      {
        testName: 'should return correct values for transfer available for anyProxyAccount',
        wallet: { ...wallets.proxiedWallet, accounts: [accounts.anyProxyAccount] },
        result: true,
      },
      {
        testName: 'should return correct values for transfer available for nonTransferProxyAccount',
        wallet: { ...wallets.proxiedWallet, accounts: [accounts.nonTransferProxyAccount] },
        result: false,
      },
      {
        testName: 'should return correct values for transfer available for stakingProxyAccount',
        wallet: { ...wallets.proxiedWallet, accounts: [accounts.stakingProxyAccount] },
        result: false,
      },
      {
        testName: 'should return correct values for transfer available for auctionProxyAccount',
        wallet: { ...wallets.proxiedWallet, accounts: [accounts.auctionProxyAccount] },
        result: false,
      },
      {
        testName: 'should return correct values for transfer available for cancelProxyAccount',
        wallet: { ...wallets.proxiedWallet, accounts: [accounts.cancelProxyAccount] },
        result: false,
      },
      {
        testName: 'should return correct values for transfer available for governanceProxyAccount',
        wallet: { ...wallets.proxiedWallet, accounts: [accounts.governanceProxyAccount] },
        result: false,
      },
      {
        testName: 'should return correct values for transfer available for identityJudgementProxyAccount',
        wallet: { ...wallets.proxiedWallet, accounts: [accounts.identityJudgementProxyAccount] },
        result: false,
      },
      {
        testName: 'should return correct values for transfer available for nominationPoolsProxyAccount',
        wallet: { ...wallets.proxiedWallet, accounts: [accounts.nominationPoolsProxyAccount] },
        result: false,
      },
    ])('$testName', ({ wallet, result }) => {
      expect(permissionUtils.canTransfer(wallet)).toEqual(result);
    });
  });

  describe('#canReceive', () => {
    test.each([
      {
        testName: 'should return correct values for receive available for watch-only wallet',
        wallet: wallets.watchOnlyWallet,
        result: false,
      },
      {
        testName: 'should return correct values for receive available for vaultWallet',
        wallet: wallets.vaultWallet,
        result: true,
      },
      {
        testName: 'should return correct values for receive available for novaWallet',
        wallet: wallets.novaWallet,
        result: true,
      },
      {
        testName: 'should return correct values for receive available for walletConnectWallet',
        wallet: wallets.walletConnectWallet,
        result: true,
      },
      {
        testName: 'should return correct values for receive available for singleParitySignerWallet',
        wallet: wallets.singleParitySignerWallet,
        result: true,
      },
      {
        testName: 'should return correct values for receive available for multishardWallet',
        wallet: wallets.multishardWallet,
        result: true,
      },
      {
        testName: 'should return correct values for receive available for multisigWallet',
        wallet: wallets.multisigWallet,
        result: true,
      },
      {
        testName: 'should return correct values for receive available for proxiedWallet',
        wallet: wallets.proxiedWallet,
        result: true,
      },
    ])('$testName', ({ wallet, result }) => {
      expect(permissionUtils.canReceive(wallet)).toEqual(result);
    });
  });

  describe('#canStake', () => {
    test.each([
      {
        testName: 'should return correct values for stake available for watchOnlyWallet',
        wallet: wallets.watchOnlyWallet,
        result: false,
      },
      {
        testName: 'should return correct values for stake available for vaultWallet',
        wallet: wallets.vaultWallet,
        result: true,
      },
      {
        testName: 'should return correct values for stake available for novaWallet',
        wallet: wallets.novaWallet,
        result: true,
      },
      {
        testName: 'should return correct values for stake available for walletConnectWallet',
        wallet: wallets.walletConnectWallet,
        result: true,
      },
      {
        testName: 'should return correct values for stake available for singleParitySignerWallet',
        wallet: wallets.singleParitySignerWallet,
        result: true,
      },
      {
        testName: 'should return correct values for stake available for multishardWallet',
        wallet: wallets.multishardWallet,
        result: true,
      },
      {
        testName: 'should return correct values for stake available for multisigWallet',
        wallet: wallets.multisigWallet,
        result: true,
      },
      {
        testName: 'should return correct values for stake available for anyProxyAccount',
        wallet: { ...wallets.proxiedWallet, accounts: [accounts.anyProxyAccount] },
        result: true,
      },
      {
        testName: 'should return correct values for stake available for nonTransferProxyAccount',
        wallet: { ...wallets.proxiedWallet, accounts: [accounts.nonTransferProxyAccount] },
        result: true,
      },
      {
        testName: 'should return correct values for stake available for stakingProxyAccount',
        wallet: { ...wallets.proxiedWallet, accounts: [accounts.stakingProxyAccount] },
        result: true,
      },
      {
        testName: 'should return correct values for stake available for auctionProxyAccount',
        wallet: { ...wallets.proxiedWallet, accounts: [accounts.auctionProxyAccount] },
        result: false,
      },
      {
        testName: 'should return correct values for stake available for cancelProxyAccount',
        wallet: { ...wallets.proxiedWallet, accounts: [accounts.cancelProxyAccount] },
        result: false,
      },
      {
        testName: 'should return correct values for stake available for governanceProxyAccount',
        wallet: { ...wallets.proxiedWallet, accounts: [accounts.governanceProxyAccount] },
        result: false,
      },
      {
        testName: 'should return correct values for stake available for identityJudgementProxyAccount',
        wallet: { ...wallets.proxiedWallet, accounts: [accounts.identityJudgementProxyAccount] },
        result: false,
      },
      {
        testName: 'should return correct values for stake available for nominationPoolsProxyAccount',
        wallet: { ...wallets.proxiedWallet, accounts: [accounts.nominationPoolsProxyAccount] },
        result: false,
      },
    ])('$testName', ({ wallet, result }) => {
      expect(permissionUtils.canStake(wallet)).toEqual(result);
    });
  });

  describe('#canCreateMultisigTx', () => {
    test.each([
      {
        testName: 'should return correct values for create multisig tx for watchOnlyWallet',
        wallet: wallets.watchOnlyWallet,
        result: false,
      },
      {
        testName: 'should return correct values for create multisig tx for vaultWallet',
        wallet: wallets.vaultWallet,
        result: true,
      },
      {
        testName: 'should return correct values for create multisig tx for novaWallet',
        wallet: wallets.novaWallet,
        result: true,
      },
      {
        testName: 'should return correct values for create multisig tx for walletConnectWallet',
        wallet: wallets.walletConnectWallet,
        result: true,
      },
      {
        testName: 'should return correct values for create multisig tx for singleParitySignerWallet',
        wallet: wallets.singleParitySignerWallet,
        result: true,
      },
      {
        testName: 'should return correct values for create multisig tx for multishardWallet',
        wallet: wallets.multishardWallet,
        result: true,
      },
      {
        testName: 'should return correct values for create multisig tx for multisigWallet',
        wallet: wallets.multisigWallet,
        result: false,
      },
      {
        testName: 'should return correct values for create multisig tx for anyProxyAccount',
        wallet: { ...wallets.proxiedWallet, accounts: [accounts.anyProxyAccount] },
        result: true,
      },
      {
        testName: 'should return correct values for create multisig tx for nonTransferProxyAccount',
        wallet: { ...wallets.proxiedWallet, accounts: [accounts.nonTransferProxyAccount] },
        result: true,
      },
      {
        testName: 'should return correct values for create multisig tx for stakingProxyAccount',
        wallet: { ...wallets.proxiedWallet, accounts: [accounts.stakingProxyAccount] },
        result: false,
      },
      {
        testName: 'should return correct values for create multisig tx for auctionProxyAccount',
        wallet: { ...wallets.proxiedWallet, accounts: [accounts.auctionProxyAccount] },
        result: false,
      },
      {
        testName: 'should return correct values for create multisig tx for cancelProxyAccount',
        wallet: { ...wallets.proxiedWallet, accounts: [accounts.cancelProxyAccount] },
        result: false,
      },
      {
        testName: 'should return correct values for create multisig tx for governanceProxyAccount',
        wallet: { ...wallets.proxiedWallet, accounts: [accounts.governanceProxyAccount] },
        result: false,
      },
      {
        testName: 'should return correct values for create multisig tx for identityJudgementProxyAccount',
        wallet: { ...wallets.proxiedWallet, accounts: [accounts.identityJudgementProxyAccount] },
        result: false,
      },
      {
        testName: 'should return correct values for create multisig tx for nominationPoolsProxyAccount',
        wallet: { ...wallets.proxiedWallet, accounts: [accounts.nominationPoolsProxyAccount] },
        result: false,
      },
    ])('$testName', ({ wallet, result }) => {
      expect(permissionUtils.canCreateMultisigTx(wallet)).toEqual(result);
    });
  });

  describe('#canApproveMultisigTx', () => {
    test.each([
      {
        testName: 'should return correct values for approve multisig tx for watchOnlyWallet',
        wallet: wallets.watchOnlyWallet,
        result: false,
      },
      {
        testName: 'should return correct values for approve multisig tx for vaultWallet',
        wallet: wallets.vaultWallet,
        result: true,
      },
      {
        testName: 'should return correct values for approve multisig tx for novaWallet',
        wallet: wallets.novaWallet,
        result: true,
      },
      {
        testName: 'should return correct values for approve multisig tx for walletConnectWallet',
        wallet: wallets.walletConnectWallet,
        result: true,
      },
      {
        testName: 'should return correct values for approve multisig tx for singleParitySignerWallet',
        wallet: wallets.singleParitySignerWallet,
        result: true,
      },
      {
        testName: 'should return correct values for approve multisig tx for multishardWallet',
        wallet: wallets.multishardWallet,
        result: true,
      },
      {
        testName: 'should return correct values for approve multisig tx for multisigWallet',
        wallet: wallets.multisigWallet,
        result: false,
      },
      {
        testName: 'should return correct values for approve multisig tx for anyProxyAccount',
        wallet: { ...wallets.proxiedWallet, accounts: [accounts.anyProxyAccount] },
        result: false,
      },
      {
        testName: 'should return correct values for approve multisig tx for nonTransferProxyAccount',
        wallet: { ...wallets.proxiedWallet, accounts: [accounts.nonTransferProxyAccount] },
        result: false,
      },
      {
        testName: 'should return correct values for approve multisig tx for stakingProxyAccount',
        wallet: { ...wallets.proxiedWallet, accounts: [accounts.stakingProxyAccount] },
        result: false,
      },
      {
        testName: 'should return correct values for approve multisig tx for auctionProxyAccount',
        wallet: { ...wallets.proxiedWallet, accounts: [accounts.auctionProxyAccount] },
        result: false,
      },
      {
        testName: 'should return correct values for approve multisig tx for cancelProxyAccount',
        wallet: { ...wallets.proxiedWallet, accounts: [accounts.cancelProxyAccount] },
        result: false,
      },
      {
        testName: 'should return correct values for approve multisig tx for governanceProxyAccount',
        wallet: { ...wallets.proxiedWallet, accounts: [accounts.governanceProxyAccount] },
        result: false,
      },
      {
        testName: 'should return correct values for approve multisig tx for identityJudgementProxyAccount',
        wallet: { ...wallets.proxiedWallet, accounts: [accounts.identityJudgementProxyAccount] },
        result: false,
      },
      {
        testName: 'should return correct values for approve multisig tx for nominationPoolsProxyAccount',
        wallet: { ...wallets.proxiedWallet, accounts: [accounts.nominationPoolsProxyAccount] },
        result: false,
      },
    ])('$testName', ({ wallet, result }) => {
      expect(permissionUtils.canApproveMultisigTx(wallet)).toEqual(result);
    });
  });

  describe('#canRejectMultisigTx', () => {
    test.each([
      {
        testName: 'should return correct values for reject multisig tx for watchOnlyWallet',
        wallet: wallets.watchOnlyWallet,
        result: false,
      },
      {
        testName: 'should return correct values for reject multisig tx for vaultWallet',
        wallet: wallets.vaultWallet,
        result: true,
      },
      {
        testName: 'should return correct values for reject multisig tx for novaWallet',
        wallet: wallets.novaWallet,
        result: true,
      },
      {
        testName: 'should return correct values for reject multisig tx for walletConnectWallet',
        wallet: wallets.walletConnectWallet,
        result: true,
      },
      {
        testName: 'should return correct values for reject multisig tx for singleParitySignerWallet',
        wallet: wallets.singleParitySignerWallet,
        result: true,
      },
      {
        testName: 'should return correct values for reject multisig tx for multishardWallet',
        wallet: wallets.multishardWallet,
        result: true,
      },
      {
        testName: 'should return correct values for reject multisig tx for multisigWallet',
        wallet: wallets.multisigWallet,
        result: false,
      },
      {
        testName: 'should return correct values for reject multisig tx for anyProxyAccount',
        wallet: { ...wallets.proxiedWallet, accounts: [accounts.anyProxyAccount] },
        result: false,
      },
      {
        testName: 'should return correct values for reject multisig tx for nonTransferProxyAccount',
        wallet: { ...wallets.proxiedWallet, accounts: [accounts.nonTransferProxyAccount] },
        result: false,
      },
      {
        testName: 'should return correct values for reject multisig tx for stakingProxyAccount',
        wallet: { ...wallets.proxiedWallet, accounts: [accounts.stakingProxyAccount] },
        result: false,
      },
      {
        testName: 'should return correct values for reject multisig tx for auctionProxyAccount',
        wallet: { ...wallets.proxiedWallet, accounts: [accounts.auctionProxyAccount] },
        result: false,
      },
      {
        testName: 'should return correct values for reject multisig tx for cancelProxyAccount',
        wallet: { ...wallets.proxiedWallet, accounts: [accounts.cancelProxyAccount] },
        result: false,
      },
      {
        testName: 'should return correct values for reject multisig tx for governanceProxyAccount',
        wallet: { ...wallets.proxiedWallet, accounts: [accounts.governanceProxyAccount] },
        result: false,
      },
      {
        testName: 'should return correct values for reject multisig tx for identityJudgementProxyAccount',
        wallet: { ...wallets.proxiedWallet, accounts: [accounts.identityJudgementProxyAccount] },
        result: false,
      },
      {
        testName: 'should return correct values for reject multisig tx for nominationPoolsProxyAccount',
        wallet: { ...wallets.proxiedWallet, accounts: [accounts.nominationPoolsProxyAccount] },
        result: false,
      },
    ])('$testName', ({ wallet, result }) => {
      expect(permissionUtils.canRejectMultisigTx(wallet)).toEqual(result);
    });
  });

  describe('#canCreateAnyProxy', () => {
    test.each([
      {
        testName: 'should return correct values for create any proxy for watchOnlyWallet',
        wallet: wallets.watchOnlyWallet,
        result: false,
      },
      {
        testName: 'should return correct values for create any proxy for vaultWallet',
        wallet: wallets.vaultWallet,
        result: true,
      },
      {
        testName: 'should return correct values for create any proxy for novaWallet',
        wallet: wallets.novaWallet,
        result: true,
      },
      {
        testName: 'should return correct values for create any proxy for walletConnectWallet',
        wallet: wallets.walletConnectWallet,
        result: true,
      },
      {
        testName: 'should return correct values for create any proxy for singleParitySignerWallet',
        wallet: wallets.singleParitySignerWallet,
        result: true,
      },
      {
        testName: 'should return correct values for create any proxy for multishardWallet',
        wallet: wallets.multishardWallet,
        result: true,
      },
      {
        testName: 'should return correct values for create any proxy for multisigWallet',
        wallet: wallets.multisigWallet,
        result: true,
      },
      {
        testName: 'should return correct values for create any proxy for anyProxyAccount',
        wallet: { ...wallets.proxiedWallet, accounts: [accounts.anyProxyAccount] },
        result: true,
      },
      {
        testName: 'should return correct values for create any proxy for nonTransferProxyAccount',
        wallet: { ...wallets.proxiedWallet, accounts: [accounts.nonTransferProxyAccount] },
        result: false,
      },
      {
        testName: 'should return correct values for create any proxy for stakingProxyAccount',
        wallet: { ...wallets.proxiedWallet, accounts: [accounts.stakingProxyAccount] },
        result: false,
      },
      {
        testName: 'should return correct values for create any proxy for auctionProxyAccount',
        wallet: { ...wallets.proxiedWallet, accounts: [accounts.auctionProxyAccount] },
        result: false,
      },
      {
        testName: 'should return correct values for create any proxy for cancelProxyAccount',
        wallet: { ...wallets.proxiedWallet, accounts: [accounts.cancelProxyAccount] },
        result: false,
      },
      {
        testName: 'should return correct values for create any proxy for governanceProxyAccount',
        wallet: { ...wallets.proxiedWallet, accounts: [accounts.governanceProxyAccount] },
        result: false,
      },
    ])('$testName', ({ wallet, result }) => {
      expect(permissionUtils.canCreateAnyProxy(wallet)).toEqual(result);
    });
  });

  describe('#canCreateNonAnyProxy', () => {
    test.each([
      {
        testName: 'should return correct values for create non any proxy for watchOnlyWallet',
        wallet: wallets.watchOnlyWallet,
        result: false,
      },
      {
        testName: 'should return correct values for create non any proxy for vaultWallet',
        wallet: wallets.vaultWallet,
        result: true,
      },
      {
        testName: 'should return correct values for create non any proxy for novaWallet',
        wallet: wallets.novaWallet,
        result: true,
      },
      {
        testName: 'should return correct values for create non any proxy for walletConnectWallet',
        wallet: wallets.walletConnectWallet,
        result: true,
      },
      {
        testName: 'should return correct values for create non any proxy for singleParitySignerWallet',
        wallet: wallets.singleParitySignerWallet,
        result: true,
      },
      {
        testName: 'should return correct values for create non any proxy for multishardWallet',
        wallet: wallets.multishardWallet,
        result: true,
      },
      {
        testName: 'should return correct values for create non any proxy for multisigWallet',
        wallet: wallets.multisigWallet,
        result: true,
      },
      {
        testName: 'should return correct values for create non any proxy for anyProxyAccount',
        wallet: { ...wallets.proxiedWallet, accounts: [accounts.anyProxyAccount] },
        result: true,
      },
      {
        testName: 'should return correct values for create non any proxy for nonTransferProxyAccount',
        wallet: { ...wallets.proxiedWallet, accounts: [accounts.nonTransferProxyAccount] },
        result: true,
      },
      {
        testName: 'should return correct values for create non any proxy for stakingProxyAccount',
        wallet: { ...wallets.proxiedWallet, accounts: [accounts.stakingProxyAccount] },
        result: false,
      },
      {
        testName: 'should return correct values for create non any proxy for auctionProxyAccount',
        wallet: { ...wallets.proxiedWallet, accounts: [accounts.auctionProxyAccount] },
        result: false,
      },
      {
        testName: 'should return correct values for create non any proxy for cancelProxyAccount',
        wallet: { ...wallets.proxiedWallet, accounts: [accounts.cancelProxyAccount] },
        result: false,
      },
      {
        testName: 'should return correct values for create non any proxy for governanceProxyAccount',
        wallet: { ...wallets.proxiedWallet, accounts: [accounts.governanceProxyAccount] },
        result: false,
      },
      {
        testName: 'should return correct values for create non any proxy for identityJudgementProxyAccount',
        wallet: { ...wallets.proxiedWallet, accounts: [accounts.identityJudgementProxyAccount] },
        result: false,
      },
      {
        testName: 'should return correct values for create non any proxy for nominationPoolsProxyAccount',
        wallet: { ...wallets.proxiedWallet, accounts: [accounts.nominationPoolsProxyAccount] },
        result: false,
      },
    ])('$testName', ({ wallet, result }) => {
      expect(permissionUtils.canCreateNonAnyProxy(wallet)).toEqual(result);
    });
  });

  describe('#canRemoveProxy', () => {
    test.each([
      {
        testName: 'should return correct values for remove proxy for watchOnlyWallet',
        wallet: wallets.watchOnlyWallet,
        result: false,
      },
      {
        testName: 'should return correct values for remove proxy for vaultWallet',
        wallet: wallets.vaultWallet,
        result: true,
      },
      {
        testName: 'should return correct values for remove proxy for novaWallet',
        wallet: wallets.novaWallet,
        result: true,
      },
      {
        testName: 'should return correct values for remove proxy for walletConnectWallet',
        wallet: wallets.walletConnectWallet,
        result: true,
      },
      {
        testName: 'should return correct values for remove proxy for singleParitySignerWallet',
        wallet: wallets.singleParitySignerWallet,
        result: true,
      },
      {
        testName: 'should return correct values for remove proxy for multishardWallet',
        wallet: wallets.multishardWallet,
        result: true,
      },
      {
        testName: 'should return correct values for remove proxy for multisigWallet',
        wallet: wallets.multisigWallet,
        result: true,
      },
      {
        testName: 'should return correct values for remove proxy for anyProxyAccount',
        wallet: { ...wallets.proxiedWallet, accounts: [accounts.anyProxyAccount] },
        result: true,
      },
      {
        testName: 'should return correct values for remove proxy for nonTransferProxyAccount',
        wallet: { ...wallets.proxiedWallet, accounts: [accounts.nonTransferProxyAccount] },
        result: true,
      },
      {
        testName: 'should return correct values for remove proxy for stakingProxyAccount',
        wallet: { ...wallets.proxiedWallet, accounts: [accounts.stakingProxyAccount] },
        result: false,
      },
      {
        testName: 'should return correct values for remove proxy for auctionProxyAccount',
        wallet: { ...wallets.proxiedWallet, accounts: [accounts.auctionProxyAccount] },
        result: false,
      },
      {
        testName: 'should return correct values for remove proxy for cancelProxyAccount',
        wallet: { ...wallets.proxiedWallet, accounts: [accounts.cancelProxyAccount] },
        result: false,
      },
      {
        testName: 'should return correct values for remove proxy for governanceProxyAccount',
        wallet: { ...wallets.proxiedWallet, accounts: [accounts.governanceProxyAccount] },
        result: false,
      },
      {
        testName: 'should return correct values for remove proxy for identityJudgementProxyAccount',
        wallet: { ...wallets.proxiedWallet, accounts: [accounts.identityJudgementProxyAccount] },
        result: false,
      },
      {
        testName: 'should return correct values for remove proxy for nominationPoolsProxyAccount',
        wallet: { ...wallets.proxiedWallet, accounts: [accounts.nominationPoolsProxyAccount] },
        result: false,
      },
    ])('$testName', ({ wallet, result }) => {
      expect(permissionUtils.canRemoveProxy(wallet)).toEqual(result);
    });
  });
});
