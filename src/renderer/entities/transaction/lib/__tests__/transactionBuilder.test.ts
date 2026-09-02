import { type Address, TransactionType } from '@/shared/core';
import { MAX_PAYOUT_CALLS_PER_BATCH, transactionBuilder } from '../transactionBuilder';

import {
  TEST_ACCOUNT_ID,
  TEST_DESTINATION,
  createMockChain,
  createMockNativeAsset,
  createMockOrmlAsset,
  createMockStatemineAsset,
} from './mocks';

describe('entities/transaction/lib/transactionBuilder', () => {
  describe('buildTransfer', () => {
    const chain = createMockChain();

    describe('NATIVE asset type', () => {
      const asset = createMockNativeAsset();

      describe('transaction type selection', () => {
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
        });
      });

      describe('keepAlive parameter', () => {
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
      });

      describe('transaction fields', () => {
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
    });

    describe('ORML asset type', () => {
      const asset = createMockOrmlAsset();

      describe('transaction type selection', () => {
        it('should create ORML_TRANSFER transaction for regular mode with keepAlive', () => {
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
        });

        it('should create ORML_TRANSFER transaction for max mode with keepAlive (not TRANSFER_ALL)', () => {
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

        it('should create ORML_TRANSFER transaction for max mode with allowDeath (not TRANSFER_ALL)', () => {
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

      describe('transaction fields', () => {
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
    });

    describe('STATEMINE asset type', () => {
      const asset = createMockStatemineAsset();

      describe('transaction type selection', () => {
        it('should create ASSET_TRANSFER transaction for regular mode with keepAlive', () => {
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
        });

        it('should create ASSET_TRANSFER transaction for max mode with keepAlive (not TRANSFER_ALL)', () => {
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

        it('should create ASSET_TRANSFER transaction for max mode with allowDeath (not TRANSFER_ALL)', () => {
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

      describe('transaction fields', () => {
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
    });
  });

  describe('buildPayoutStakers', () => {
    const chain = createMockChain();
    const validatorA = '5FHneW46xGXgs5mUiveU4sbTyGBzmstUspZC92UhjJM694ty' as Address;
    const validatorB = '5GrwvaEF5zXb26Fz9rcQpDWS57CtERHpNehXCPcNoHGKutQY' as Address;

    it('should build bare PAYOUT_STAKERS_BY_PAGE transaction for a single payout', () => {
      const transaction = transactionBuilder.buildPayoutStakers({
        chain,
        accountId: TEST_ACCOUNT_ID,
        payouts: [{ validatorStash: validatorA, era: 100, page: 0 }],
      });

      expect(transaction.type).toBe(TransactionType.PAYOUT_STAKERS_BY_PAGE);
      expect(transaction.chainId).toBe(chain.chainId);
      expect(transaction.accountId).toBe(TEST_ACCOUNT_ID);
      expect(transaction.args).toEqual({ validatorStash: validatorA, era: 100, page: 0 });
    });

    it('should wrap multiple payouts in BATCH_ALL', () => {
      const transaction = transactionBuilder.buildPayoutStakers({
        chain,
        accountId: TEST_ACCOUNT_ID,
        payouts: [
          { validatorStash: validatorA, era: 100, page: 0 },
          { validatorStash: validatorB, era: 101, page: 1 },
        ],
      });

      expect(transaction.type).toBe(TransactionType.BATCH_ALL);
      expect(transaction.args.transactions).toHaveLength(2);
      for (const innerTx of transaction.args.transactions) {
        expect(innerTx.type).toBe(TransactionType.PAYOUT_STAKERS_BY_PAGE);
      }
    });

    it('should sort payouts by era ascending, then by validator', () => {
      const transaction = transactionBuilder.buildPayoutStakers({
        chain,
        accountId: TEST_ACCOUNT_ID,
        payouts: [
          { validatorStash: validatorB, era: 101, page: 0 },
          { validatorStash: validatorB, era: 100, page: 0 },
          { validatorStash: validatorA, era: 101, page: 0 },
        ],
      });

      const args = transaction.args.transactions.map((tx: { args: Record<string, unknown> }) => tx.args);
      expect(args).toEqual([
        { validatorStash: validatorB, era: 100, page: 0 },
        { validatorStash: validatorA, era: 101, page: 0 },
        { validatorStash: validatorB, era: 101, page: 0 },
      ]);
    });

    it('should throw when payouts list is empty', () => {
      expect(() => {
        transactionBuilder.buildPayoutStakers({ chain, accountId: TEST_ACCOUNT_ID, payouts: [] });
      }).toThrow();
    });

    it('should throw when payouts exceed MAX_PAYOUT_CALLS_PER_BATCH', () => {
      const payouts = Array.from({ length: MAX_PAYOUT_CALLS_PER_BATCH + 1 }, (_, index) => ({
        validatorStash: validatorA,
        era: index,
        page: 0,
      }));

      expect(() => {
        transactionBuilder.buildPayoutStakers({ chain, accountId: TEST_ACCOUNT_ID, payouts });
      }).toThrow();
    });

    it('should accept exactly MAX_PAYOUT_CALLS_PER_BATCH payouts', () => {
      const payouts = Array.from({ length: MAX_PAYOUT_CALLS_PER_BATCH }, (_, index) => ({
        validatorStash: validatorA,
        era: index,
        page: 0,
      }));

      const transaction = transactionBuilder.buildPayoutStakers({ chain, accountId: TEST_ACCOUNT_ID, payouts });

      expect(transaction.type).toBe(TransactionType.BATCH_ALL);
      expect(transaction.args.transactions).toHaveLength(MAX_PAYOUT_CALLS_PER_BATCH);
    });
  });

  describe('buildUnlock', () => {
    const chain = createMockChain();

    it('maps an undelegate action to an UNDELEGATE call with the track', () => {
      const transaction = transactionBuilder.buildUnlock({
        chain,
        accountId: TEST_ACCOUNT_ID,
        actions: [{ type: 'undelegate', trackId: '20' }],
        amount: '0',
        target: TEST_ACCOUNT_ID,
      });

      expect(transaction.type).toBe(TransactionType.UNDELEGATE);
      expect(transaction.args).toEqual({ track: '20' });
    });

    it('batches undelegates before the unlock that follows them', () => {
      const transaction = transactionBuilder.buildUnlock({
        chain,
        accountId: TEST_ACCOUNT_ID,
        actions: [
          { type: 'undelegate', trackId: '20' },
          { type: 'unlock', trackId: '20' },
        ],
        amount: '100',
        target: TEST_ACCOUNT_ID,
      });

      expect(transaction.type).toBe(TransactionType.BATCH_ALL);
      expect(transaction.args.transactions.map((tx: { type: TransactionType }) => tx.type)).toEqual([
        TransactionType.UNDELEGATE,
        TransactionType.UNLOCK,
      ]);
    });
  });
});
