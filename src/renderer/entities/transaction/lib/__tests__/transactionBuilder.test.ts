import { TransactionType } from '@/shared/core';
import { transactionBuilder } from '../transactionBuilder';

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
});
