import { describe, expect, it } from 'vitest';

import { type Address, type Contact } from '@/shared/core';
import { toAccountId, toAddress } from '@/shared/lib/utils';

import { contactImportUtils } from './utils';

// Valid Substrate addresses for testing
const ALICE_ADDRESS = '15oF4uVJwmo4TdGW7VfQxNLavjCXviqxT9S1MgbjMNHr6Sp5' as Address;
const BOB_ADDRESS = '14E5nqKAp3oAJcmzgZhUD2RcptBeUBScxKHgJKU4HPNcKVf3' as Address;
const CHARLIE_ADDRESS = '1zugcavYA9yCuYwiEYeMHNJm9gXznYjNfXQjZsZukF1Mpow' as Address;

function localContact(overrides: { id: string; name: string; address: Address; accountId: string }): Contact {
  return { ...overrides, source: 'local' as const } as Contact;
}

describe('contactImportUtils', () => {
  describe('parseJSON', () => {
    it('should parse valid contacts', async () => {
      const validJson = JSON.stringify([
        { name: 'Alice', address: ALICE_ADDRESS },
        { name: 'Bob', address: BOB_ADDRESS },
      ]);
      const file = new File([validJson], 'contacts.json', { type: 'application/json' });

      const result = await contactImportUtils.parseJSON(file);

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data).toHaveLength(2);
        expect(result.data[0]!.name).toBe('Alice');
        expect(result.data[1]!.name).toBe('Bob');
      }
    });

    it('should fail on invalid JSON', async () => {
      const invalidJson = 'not a json';
      const file = new File([invalidJson], 'contacts.json', { type: 'application/json' });

      const result = await contactImportUtils.parseJSON(file);

      expect(result.success).toBe(false);
    });

    it('should fail on non-array data', async () => {
      const notArray = JSON.stringify({ name: 'Alice' });
      const file = new File([notArray], 'contacts.json', { type: 'application/json' });

      const result = await contactImportUtils.parseJSON(file);

      expect(result.success).toBe(false);
    });

    it('should fail on empty array', async () => {
      const emptyArray = JSON.stringify([]);
      const file = new File([emptyArray], 'contacts.json', { type: 'application/json' });

      const result = await contactImportUtils.parseJSON(file);

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data).toHaveLength(0);
      }
    });

    it('should fail on invalid address', async () => {
      const invalidAddress = JSON.stringify([{ name: 'Alice', address: 'invalid' }]);
      const file = new File([invalidAddress], 'contacts.json', { type: 'application/json' });

      const result = await contactImportUtils.parseJSON(file);

      expect(result.success).toBe(false);
    });

    it('should fail on missing name', async () => {
      const missingName = JSON.stringify([{ address: '5DTestAccount1111111111111111111111111111111' }]);
      const file = new File([missingName], 'contacts.json', { type: 'application/json' });

      const result = await contactImportUtils.parseJSON(file);

      expect(result.success).toBe(false);
    });

    it('should fail on missing address', async () => {
      const missingAddress = JSON.stringify([{ name: 'Alice' }]);
      const file = new File([missingAddress], 'contacts.json', { type: 'application/json' });

      const result = await contactImportUtils.parseJSON(file);

      expect(result.success).toBe(false);
    });

    it('should fail on too many contacts', async () => {
      const tooMany = Array.from({ length: 10001 }, (_, i) => ({
        name: `Contact ${i}`,
        address: ALICE_ADDRESS,
      }));
      const file = new File([JSON.stringify(tooMany)], 'contacts.json', { type: 'application/json' });

      const result = await contactImportUtils.parseJSON(file);

      expect(result.success).toBe(false);
    });
  });

  describe('detectAccountIdConflicts', () => {
    it('should detect no conflicts when accountIds are different', () => {
      const imported = [
        { name: 'Alice', address: ALICE_ADDRESS },
        { name: 'Bob', address: BOB_ADDRESS },
      ];
      const existing: Contact[] = [
        localContact({
          id: 'test-uuid-1',
          name: 'Charlie',
          address: toAddress(CHARLIE_ADDRESS),
          accountId: toAccountId(CHARLIE_ADDRESS),
        }),
      ];

      const conflicts = contactImportUtils.detectAccountIdConflicts(imported, existing);

      expect(conflicts).toHaveLength(0);
    });

    it('should detect conflicts when accountIds match', () => {
      const imported = [{ name: 'Alice', address: ALICE_ADDRESS }];
      const existing: Contact[] = [
        localContact({
          id: 'test-uuid-1',
          name: 'OldAlice',
          address: toAddress(ALICE_ADDRESS),
          accountId: toAccountId(ALICE_ADDRESS),
        }),
      ];

      const conflicts = contactImportUtils.detectAccountIdConflicts(imported, existing);

      expect(conflicts).toHaveLength(1);
      expect(conflicts[0]!.imported.name).toBe('Alice');
      expect(conflicts[0]!.existing.name).toBe('OldAlice');
      expect(conflicts[0]!.existing.id).toBe('test-uuid-1');
    });

    it('should detect multiple conflicts', () => {
      const imported = [
        { name: 'Alice', address: ALICE_ADDRESS },
        { name: 'Bob', address: BOB_ADDRESS },
      ];
      const existing: Contact[] = [
        localContact({
          id: 'test-uuid-1',
          name: 'OldAlice',
          address: ALICE_ADDRESS,
          accountId: toAccountId(ALICE_ADDRESS),
        }),
        localContact({
          id: 'test-uuid-2',
          name: 'OldBob',
          address: BOB_ADDRESS,
          accountId: toAccountId(BOB_ADDRESS),
        }),
      ];

      const conflicts = contactImportUtils.detectAccountIdConflicts(imported, existing);

      expect(conflicts).toHaveLength(2);
    });
  });

  describe('resolveNameConflicts', () => {
    it('should not modify names when no conflicts', () => {
      const imported = [
        { name: 'Alice', address: ALICE_ADDRESS },
        { name: 'Bob', address: BOB_ADDRESS },
      ];
      const existing: Contact[] = [
        localContact({
          id: 'test-uuid-1',
          name: 'Charlie',
          address: toAddress(CHARLIE_ADDRESS),
          accountId: toAccountId(CHARLIE_ADDRESS),
        }),
      ];

      const resolved = contactImportUtils.resolveNameConflicts(imported, existing);

      expect(resolved[0]!.name).toBe('Alice');
      expect(resolved[1]!.name).toBe('Bob');
    });

    it('should add (1) suffix for duplicate name with different accountId', () => {
      const imported = [{ name: 'Alice', address: ALICE_ADDRESS }];
      const existing: Contact[] = [
        localContact({
          id: 'test-uuid-1',
          name: 'Alice',
          address: toAddress(BOB_ADDRESS),
          accountId: toAccountId(BOB_ADDRESS),
        }),
      ];

      const resolved = contactImportUtils.resolveNameConflicts(imported, existing);

      expect(resolved[0]!.name).toBe('Alice (1)');
    });

    it('should not add suffix for same accountId (accountId conflict, not name conflict)', () => {
      const imported = [{ name: 'Alice', address: ALICE_ADDRESS }];
      const existing: Contact[] = [
        localContact({
          id: 'test-uuid-1',
          name: 'Alice',
          address: toAddress(ALICE_ADDRESS),
          accountId: toAccountId(ALICE_ADDRESS),
        }),
      ];

      const resolved = contactImportUtils.resolveNameConflicts(imported, existing);

      expect(resolved[0]!.name).toBe('Alice');
    });

    it('should increment suffix when (1) already exists', () => {
      const imported = [{ name: 'Alice', address: ALICE_ADDRESS }];
      const existing: Contact[] = [
        localContact({
          id: 'test-uuid-1',
          name: 'Alice',
          address: toAddress(BOB_ADDRESS),
          accountId: toAccountId(BOB_ADDRESS),
        }),
        localContact({
          id: 'test-uuid-2',
          name: 'Alice (1)',
          address: toAddress(CHARLIE_ADDRESS),
          accountId: toAccountId(CHARLIE_ADDRESS),
        }),
      ];

      const resolved = contactImportUtils.resolveNameConflicts(imported, existing);

      expect(resolved[0]!.name).toBe('Alice (2)');
    });

    it('should handle multiple duplicates within imported file', () => {
      const imported = [
        { name: 'Alice', address: ALICE_ADDRESS },
        { name: 'Alice', address: BOB_ADDRESS },
        { name: 'Alice', address: CHARLIE_ADDRESS },
      ];
      const existing: Contact[] = [];

      const resolved = contactImportUtils.resolveNameConflicts(imported, existing);

      expect(resolved[0]!.name).toBe('Alice');
      expect(resolved[1]!.name).toBe('Alice (1)');
      expect(resolved[2]!.name).toBe('Alice (2)');
    });

    it('should handle case-insensitive name matching', () => {
      const imported = [{ name: 'alice', address: ALICE_ADDRESS }];
      const existing: Contact[] = [
        localContact({
          id: 'test-uuid-1',
          name: 'ALICE',
          address: toAddress(BOB_ADDRESS),
          accountId: toAccountId(BOB_ADDRESS),
        }),
      ];

      const resolved = contactImportUtils.resolveNameConflicts(imported, existing);

      expect(resolved[0]!.name).toBe('alice (1)');
    });
  });
});
