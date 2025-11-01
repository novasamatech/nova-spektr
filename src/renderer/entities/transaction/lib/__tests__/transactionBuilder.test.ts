import { type Asset, AssetType, type Chain, TransactionType } from '@/shared/core';
import { type AccountId } from '@/shared/polkadotjs-schemas';
import { transactionBuilder } from '../transactionBuilder';

// Mock data
const createMockChain = (chainId: string = 'polkadot'): Chain => ({
  chainId: chainId as any,
  specName: 'polkadot',
  name: 'Test Chain',
  nodes: [],
  assets: [],
  icon: '',
  addressPrefix: 0,
  options: [],
});

const createMockNativeAsset = (): Asset => ({
  name: 'DOT',
  assetId: 0 as any,
  symbol: 'DOT',
  precision: 10,
  type: AssetType.NATIVE,
  icon: {
    monochrome: '',
    colored: '',
  },
});

const createMockOrmlAsset = (): Asset => ({
  name: 'USDT',
  assetId: 1 as any,
  symbol: 'USDT',
  precision: 6,
  type: AssetType.ORML,
  icon: {
    monochrome: '',
    colored: '',
  },
  typeExtras: {
    existentialDeposit: '1000000',
    currencyIdScale: '5',
    currencyIdType: 'u32',
  },
});

const createMockStatemineAsset = (): Asset => ({
  name: 'KSM',
  assetId: 1984 as any,
  symbol: 'KSM',
  precision: 12,
  type: AssetType.STATEMINE,
  icon: {
    monochrome: '',
    colored: '',
  },
  typeExtras: {
    assetId: '1984',
    palletName: 'assets',
  },
});

const TEST_ACCOUNT_ID = '5GrwvaEF5zXb26Fz9rcQpDWS57CtERHpNehXCPcNoHGKutQY' as AccountId;
const TEST_DESTINATION = '5FHneW46xGXgs5mUiveU4sbTyGBzmstUspZC92UhjJM694ty';

describe('entities/transaction/lib/transactionBuilder', () => {
  describe('buildTransfer', () => {
    const chain = createMockChain();

    describe('NATIVE asset type', () => {
      const asset = createMockNativeAsset();

      it('should create TRANSFER transaction for regular mode with keepAlive', () => {
        const transaction = transactionBuilder.buildTransfer({
          chain,
          asset,
          accountId: TEST_ACCOUNT_ID,
          destination: TEST_DESTINATION,
          amount: '1000000000000',
          inputMode: 'regular',
          balancePreservation: 'keepAlive',
        });

        expect(transaction.type).toBe(TransactionType.TRANSFER);
        expect(transaction.args.keepAlive).toBeUndefined();
      });

      it('should create TRANSFER_ALLOW_DEATH transaction for regular mode with allowDeath', () => {
        const transaction = transactionBuilder.buildTransfer({
          chain,
          asset,
          accountId: TEST_ACCOUNT_ID,
          destination: TEST_DESTINATION,
          amount: '1000000000000',
          inputMode: 'regular',
          balancePreservation: 'allowDeath',
        });

        expect(transaction.type).toBe(TransactionType.TRANSFER_ALLOW_DEATH);
        expect(transaction.args.keepAlive).toBeUndefined();
      });

      it('should create TRANSFER_ALL transaction for max mode with keepAlive', () => {
        const transaction = transactionBuilder.buildTransfer({
          chain,
          asset,
          accountId: TEST_ACCOUNT_ID,
          destination: TEST_DESTINATION,
          amount: '1000000000000',
          inputMode: 'max',
          balancePreservation: 'keepAlive',
        });

        expect(transaction.type).toBe(TransactionType.TRANSFER_ALL);
        expect(transaction.args.keepAlive).toBe(true);
      });

      it('should create TRANSFER_ALL transaction for max mode with allowDeath', () => {
        const transaction = transactionBuilder.buildTransfer({
          chain,
          asset,
          accountId: TEST_ACCOUNT_ID,
          destination: TEST_DESTINATION,
          amount: '1000000000000',
          inputMode: 'max',
          balancePreservation: 'allowDeath',
        });

        expect(transaction.type).toBe(TransactionType.TRANSFER_ALL);
        expect(transaction.args.keepAlive).toBe(false);
      });

      it('should include correct transaction fields', () => {
        const transaction = transactionBuilder.buildTransfer({
          chain,
          asset,
          accountId: TEST_ACCOUNT_ID,
          destination: TEST_DESTINATION,
          amount: '1000000000000',
          inputMode: 'max',
          balancePreservation: 'keepAlive',
        });

        expect(transaction.chainId).toBe(chain.chainId);
        expect(transaction.accountId).toBe(TEST_ACCOUNT_ID);
        expect(transaction.args.dest).toBe(TEST_DESTINATION);
        // formatAmount multiplies by precision (10^10 for NATIVE)
        expect(transaction.args.value).toBe('10000000000000000000000');
      });
    });

    describe('ORML asset type', () => {
      const asset = createMockOrmlAsset();

      it('should create ORML_TRANSFER transaction for regular mode', () => {
        const transaction = transactionBuilder.buildTransfer({
          chain,
          asset,
          accountId: TEST_ACCOUNT_ID,
          destination: TEST_DESTINATION,
          amount: '1000000',
          inputMode: 'regular',
          balancePreservation: 'keepAlive',
        });

        expect(transaction.type).toBe(TransactionType.ORML_TRANSFER);
        expect(transaction.args.keepAlive).toBeUndefined();
      });

      it('should create ORML_TRANSFER transaction for regular mode with allowDeath', () => {
        const transaction = transactionBuilder.buildTransfer({
          chain,
          asset,
          accountId: TEST_ACCOUNT_ID,
          destination: TEST_DESTINATION,
          amount: '1000000',
          inputMode: 'regular',
          balancePreservation: 'allowDeath',
        });

        expect(transaction.type).toBe(TransactionType.ORML_TRANSFER);
        expect(transaction.args.keepAlive).toBeUndefined();
      });

      it('should create ORML_TRANSFER transaction for max mode with keepAlive', () => {
        const transaction = transactionBuilder.buildTransfer({
          chain,
          asset,
          accountId: TEST_ACCOUNT_ID,
          destination: TEST_DESTINATION,
          amount: '1000000',
          inputMode: 'max',
          balancePreservation: 'keepAlive',
        });

        expect(transaction.type).toBe(TransactionType.ORML_TRANSFER);
        expect(transaction.args.keepAlive).toBeUndefined();
      });

      it('should create ORML_TRANSFER transaction for max mode with allowDeath', () => {
        const transaction = transactionBuilder.buildTransfer({
          chain,
          asset,
          accountId: TEST_ACCOUNT_ID,
          destination: TEST_DESTINATION,
          amount: '1000000',
          inputMode: 'max',
          balancePreservation: 'allowDeath',
        });

        expect(transaction.type).toBe(TransactionType.ORML_TRANSFER);
        expect(transaction.args.keepAlive).toBeUndefined();
      });

      it('should include asset in args', () => {
        const transaction = transactionBuilder.buildTransfer({
          chain,
          asset,
          accountId: TEST_ACCOUNT_ID,
          destination: TEST_DESTINATION,
          amount: '1000000',
          inputMode: 'regular',
          balancePreservation: 'keepAlive',
        });

        expect(transaction.args.asset).toBeDefined();
      });
    });

    describe('STATEMINE asset type', () => {
      const asset = createMockStatemineAsset();

      it('should create ASSET_TRANSFER transaction for regular mode', () => {
        const transaction = transactionBuilder.buildTransfer({
          chain,
          asset,
          accountId: TEST_ACCOUNT_ID,
          destination: TEST_DESTINATION,
          amount: '1000000000000',
          inputMode: 'regular',
          balancePreservation: 'keepAlive',
        });

        expect(transaction.type).toBe(TransactionType.ASSET_TRANSFER);
        expect(transaction.args.keepAlive).toBeUndefined();
      });

      it('should create ASSET_TRANSFER transaction for regular mode with allowDeath', () => {
        const transaction = transactionBuilder.buildTransfer({
          chain,
          asset,
          accountId: TEST_ACCOUNT_ID,
          destination: TEST_DESTINATION,
          amount: '1000000000000',
          inputMode: 'regular',
          balancePreservation: 'allowDeath',
        });

        expect(transaction.type).toBe(TransactionType.ASSET_TRANSFER);
        expect(transaction.args.keepAlive).toBeUndefined();
      });

      it('should create ASSET_TRANSFER transaction for max mode with keepAlive', () => {
        const transaction = transactionBuilder.buildTransfer({
          chain,
          asset,
          accountId: TEST_ACCOUNT_ID,
          destination: TEST_DESTINATION,
          amount: '1000000000000',
          inputMode: 'max',
          balancePreservation: 'keepAlive',
        });

        expect(transaction.type).toBe(TransactionType.ASSET_TRANSFER);
        expect(transaction.args.keepAlive).toBeUndefined();
      });

      it('should create ASSET_TRANSFER transaction for max mode with allowDeath', () => {
        const transaction = transactionBuilder.buildTransfer({
          chain,
          asset,
          accountId: TEST_ACCOUNT_ID,
          destination: TEST_DESTINATION,
          amount: '1000000000000',
          inputMode: 'max',
          balancePreservation: 'allowDeath',
        });

        expect(transaction.type).toBe(TransactionType.ASSET_TRANSFER);
        expect(transaction.args.keepAlive).toBeUndefined();
      });

      it('should include asset and palletName in args', () => {
        const transaction = transactionBuilder.buildTransfer({
          chain,
          asset,
          accountId: TEST_ACCOUNT_ID,
          destination: TEST_DESTINATION,
          amount: '1000000000000',
          inputMode: 'regular',
          balancePreservation: 'keepAlive',
        });

        expect(transaction.args.asset).toBeDefined();
        expect(transaction.args.palletName).toBe('assets');
      });
    });

    describe('transaction type determination logic', () => {
      const chain = createMockChain();

      describe('NATIVE asset type', () => {
        const asset = createMockNativeAsset();

        it('should return TRANSFER for regular + keepAlive', () => {
          const transaction = transactionBuilder.buildTransfer({
            chain,
            asset,
            accountId: TEST_ACCOUNT_ID,
            destination: TEST_DESTINATION,
            amount: '1000000000000',
            inputMode: 'regular',
            balancePreservation: 'keepAlive',
          });

          expect(transaction.type).toBe(TransactionType.TRANSFER);
        });

        it('should return TRANSFER_ALLOW_DEATH for regular + allowDeath', () => {
          const transaction = transactionBuilder.buildTransfer({
            chain,
            asset,
            accountId: TEST_ACCOUNT_ID,
            destination: TEST_DESTINATION,
            amount: '1000000000000',
            inputMode: 'regular',
            balancePreservation: 'allowDeath',
          });

          expect(transaction.type).toBe(TransactionType.TRANSFER_ALLOW_DEATH);
        });

        it('should return TRANSFER_ALL for max + keepAlive', () => {
          const transaction = transactionBuilder.buildTransfer({
            chain,
            asset,
            accountId: TEST_ACCOUNT_ID,
            destination: TEST_DESTINATION,
            amount: '1000000000000',
            inputMode: 'max',
            balancePreservation: 'keepAlive',
          });

          expect(transaction.type).toBe(TransactionType.TRANSFER_ALL);
        });

        it('should return TRANSFER_ALL for max + allowDeath', () => {
          const transaction = transactionBuilder.buildTransfer({
            chain,
            asset,
            accountId: TEST_ACCOUNT_ID,
            destination: TEST_DESTINATION,
            amount: '1000000000000',
            inputMode: 'max',
            balancePreservation: 'allowDeath',
          });

          expect(transaction.type).toBe(TransactionType.TRANSFER_ALL);
        });
      });

      describe('ORML asset type', () => {
        const asset = createMockOrmlAsset();

        it('should return ORML_TRANSFER for regular + keepAlive', () => {
          const transaction = transactionBuilder.buildTransfer({
            chain,
            asset,
            accountId: TEST_ACCOUNT_ID,
            destination: TEST_DESTINATION,
            amount: '1000000',
            inputMode: 'regular',
            balancePreservation: 'keepAlive',
          });

          expect(transaction.type).toBe(TransactionType.ORML_TRANSFER);
        });

        it('should return ORML_TRANSFER for regular + allowDeath', () => {
          const transaction = transactionBuilder.buildTransfer({
            chain,
            asset,
            accountId: TEST_ACCOUNT_ID,
            destination: TEST_DESTINATION,
            amount: '1000000',
            inputMode: 'regular',
            balancePreservation: 'allowDeath',
          });

          expect(transaction.type).toBe(TransactionType.ORML_TRANSFER);
        });

        it('should return ORML_TRANSFER for max + keepAlive (not TRANSFER_ALL)', () => {
          const transaction = transactionBuilder.buildTransfer({
            chain,
            asset,
            accountId: TEST_ACCOUNT_ID,
            destination: TEST_DESTINATION,
            amount: '1000000',
            inputMode: 'max',
            balancePreservation: 'keepAlive',
          });

          expect(transaction.type).toBe(TransactionType.ORML_TRANSFER);
          expect(transaction.type).not.toBe(TransactionType.TRANSFER_ALL);
        });

        it('should return ORML_TRANSFER for max + allowDeath (not TRANSFER_ALL)', () => {
          const transaction = transactionBuilder.buildTransfer({
            chain,
            asset,
            accountId: TEST_ACCOUNT_ID,
            destination: TEST_DESTINATION,
            amount: '1000000',
            inputMode: 'max',
            balancePreservation: 'allowDeath',
          });

          expect(transaction.type).toBe(TransactionType.ORML_TRANSFER);
          expect(transaction.type).not.toBe(TransactionType.TRANSFER_ALL);
        });
      });

      describe('STATEMINE asset type', () => {
        const asset = createMockStatemineAsset();

        it('should return ASSET_TRANSFER for regular + keepAlive', () => {
          const transaction = transactionBuilder.buildTransfer({
            chain,
            asset,
            accountId: TEST_ACCOUNT_ID,
            destination: TEST_DESTINATION,
            amount: '1000000000000',
            inputMode: 'regular',
            balancePreservation: 'keepAlive',
          });

          expect(transaction.type).toBe(TransactionType.ASSET_TRANSFER);
        });

        it('should return ASSET_TRANSFER for regular + allowDeath', () => {
          const transaction = transactionBuilder.buildTransfer({
            chain,
            asset,
            accountId: TEST_ACCOUNT_ID,
            destination: TEST_DESTINATION,
            amount: '1000000000000',
            inputMode: 'regular',
            balancePreservation: 'allowDeath',
          });

          expect(transaction.type).toBe(TransactionType.ASSET_TRANSFER);
        });

        it('should return ASSET_TRANSFER for max + keepAlive (not TRANSFER_ALL)', () => {
          const transaction = transactionBuilder.buildTransfer({
            chain,
            asset,
            accountId: TEST_ACCOUNT_ID,
            destination: TEST_DESTINATION,
            amount: '1000000000000',
            inputMode: 'max',
            balancePreservation: 'keepAlive',
          });

          expect(transaction.type).toBe(TransactionType.ASSET_TRANSFER);
          expect(transaction.type).not.toBe(TransactionType.TRANSFER_ALL);
        });

        it('should return ASSET_TRANSFER for max + allowDeath (not TRANSFER_ALL)', () => {
          const transaction = transactionBuilder.buildTransfer({
            chain,
            asset,
            accountId: TEST_ACCOUNT_ID,
            destination: TEST_DESTINATION,
            amount: '1000000000000',
            inputMode: 'max',
            balancePreservation: 'allowDeath',
          });

          expect(transaction.type).toBe(TransactionType.ASSET_TRANSFER);
          expect(transaction.type).not.toBe(TransactionType.TRANSFER_ALL);
        });
      });
    });

    describe('keepAlive parameter', () => {
      const asset = createMockNativeAsset();

      it('should set keepAlive to true when balancePreservation is keepAlive for TRANSFER_ALL', () => {
        const transaction = transactionBuilder.buildTransfer({
          chain,
          asset,
          accountId: TEST_ACCOUNT_ID,
          destination: TEST_DESTINATION,
          amount: '1000000000000',
          inputMode: 'max',
          balancePreservation: 'keepAlive',
        });

        expect(transaction.type).toBe(TransactionType.TRANSFER_ALL);
        expect(transaction.args.keepAlive).toBe(true);
      });

      it('should set keepAlive to false when balancePreservation is allowDeath for TRANSFER_ALL', () => {
        const transaction = transactionBuilder.buildTransfer({
          chain,
          asset,
          accountId: TEST_ACCOUNT_ID,
          destination: TEST_DESTINATION,
          amount: '1000000000000',
          inputMode: 'max',
          balancePreservation: 'allowDeath',
        });

        expect(transaction.type).toBe(TransactionType.TRANSFER_ALL);
        expect(transaction.args.keepAlive).toBe(false);
      });

      it('should not include keepAlive for TRANSFER transaction', () => {
        const transaction = transactionBuilder.buildTransfer({
          chain,
          asset,
          accountId: TEST_ACCOUNT_ID,
          destination: TEST_DESTINATION,
          amount: '1000000000000',
          inputMode: 'regular',
          balancePreservation: 'keepAlive',
        });

        expect(transaction.type).toBe(TransactionType.TRANSFER);
        expect(transaction.args.keepAlive).toBeUndefined();
      });

      it('should not include keepAlive for TRANSFER_ALLOW_DEATH transaction', () => {
        const transaction = transactionBuilder.buildTransfer({
          chain,
          asset,
          accountId: TEST_ACCOUNT_ID,
          destination: TEST_DESTINATION,
          amount: '1000000000000',
          inputMode: 'regular',
          balancePreservation: 'allowDeath',
        });

        expect(transaction.type).toBe(TransactionType.TRANSFER_ALLOW_DEATH);
        expect(transaction.args.keepAlive).toBeUndefined();
      });

      it('should not include keepAlive for ORML_TRANSFER transaction', () => {
        const ormlAsset = createMockOrmlAsset();
        const transaction = transactionBuilder.buildTransfer({
          chain,
          asset: ormlAsset,
          accountId: TEST_ACCOUNT_ID,
          destination: TEST_DESTINATION,
          amount: '1000000',
          inputMode: 'max',
          balancePreservation: 'keepAlive',
        });

        expect(transaction.type).toBe(TransactionType.ORML_TRANSFER);
        expect(transaction.args.keepAlive).toBeUndefined();
      });

      it('should not include keepAlive for ASSET_TRANSFER transaction', () => {
        const statemineAsset = createMockStatemineAsset();
        const transaction = transactionBuilder.buildTransfer({
          chain,
          asset: statemineAsset,
          accountId: TEST_ACCOUNT_ID,
          destination: TEST_DESTINATION,
          amount: '1000000000000',
          inputMode: 'max',
          balancePreservation: 'keepAlive',
        });

        expect(transaction.type).toBe(TransactionType.ASSET_TRANSFER);
        expect(transaction.args.keepAlive).toBeUndefined();
      });
    });
  });
});
