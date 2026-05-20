import { allSettled, fork } from 'effector';
import { describe, expect, it, vi } from 'vitest';

import { type LocalContact } from '@/shared/core';
import { toAccountId, toAddress } from '@/shared/lib/utils';
import { contactModel } from '@/entities/contact';
import { importContactsModel } from '../import-contacts-model';

import * as mockData from './mocks/import-data';

function localContact(overrides: Partial<LocalContact> & { id: string; name: string; address: string }): LocalContact {
  return {
    accountId: toAccountId(overrides.address),
    source: 'local' as const,
    ...overrides,
  } as LocalContact;
}

const createMockFile = (data: unknown): File => {
  const content = typeof data === 'string' ? data : JSON.stringify(data);
  return new File([content], 'contacts.json', { type: 'application/json' });
};

describe('importContactsModel', () => {
  describe('file size validation', () => {
    it('should reject files larger than 1MB', async () => {
      const largeContent = 'x'.repeat(2 * 1024 * 1024); // 2MB
      const file = createMockFile(largeContent);

      const scope = fork();

      await allSettled(importContactsModel.events.fileSelected, { scope, params: file });

      const state = scope.getState(importContactsModel.$importState);

      expect(state.status).toBe('error');
      if (state.status === 'error') {
        expect(state.reason).toBe('fileTooLarge');
      }
    });

    it('should accept files smaller than 1MB', async () => {
      const file = createMockFile(mockData.VALID_CONTACTS);

      const scope = fork();

      await allSettled(importContactsModel.events.fileSelected, { scope, params: file });

      const state = scope.getState(importContactsModel.$importState);

      expect(state.status).not.toBe('error');
    });
  });

  describe('parseFileFx', () => {
    it('should parse valid contacts from Polkadot.js export', async () => {
      const file = createMockFile(mockData.VALID_CONTACTS);

      const scope = fork();

      await allSettled(importContactsModel.events.fileSelected, { scope, params: file });

      const state = scope.getState(importContactsModel.$importState);

      // When no conflicts, it auto-imports → success or importing
      expect(['importing', 'success']).toContain(state.status);
    });

    it('should accept contacts with only name and address fields', async () => {
      const file = createMockFile(mockData.ONLY_NAME_AND_ADDRESS);

      const scope = fork();

      await allSettled(importContactsModel.events.fileSelected, { scope, params: file });

      const state = scope.getState(importContactsModel.$importState);

      expect(state.status).not.toBe('error');
    });

    it('should accept contacts with additional parameters', async () => {
      const file = createMockFile(mockData.ADDITIONAL_PARAMS);

      const scope = fork();

      await allSettled(importContactsModel.events.fileSelected, { scope, params: file });

      const state = scope.getState(importContactsModel.$importState);

      expect(state.status).not.toBe('error');
    });

    it('should set error on invalid JSON', async () => {
      const file = createMockFile(mockData.INVALID_JSON);

      const scope = fork();

      await allSettled(importContactsModel.events.fileSelected, { scope, params: file });

      const state = scope.getState(importContactsModel.$importState);

      expect(state.status).toBe('error');
      if (state.status === 'error') {
        expect(state.reason).toBe('parseError');
      }
    });

    it('should set error on non-array data', async () => {
      const file = createMockFile(mockData.NOT_ARRAY);

      const scope = fork();

      await allSettled(importContactsModel.events.fileSelected, { scope, params: file });

      const state = scope.getState(importContactsModel.$importState);

      expect(state.status).toBe('error');
      if (state.status === 'error') {
        expect(state.reason).toBe('parseError');
      }
    });

    it('should set error with emptyList on empty array', async () => {
      const file = createMockFile(mockData.EMPTY_ARRAY);

      const scope = fork();

      await allSettled(importContactsModel.events.fileSelected, { scope, params: file });

      const state = scope.getState(importContactsModel.$importState);

      expect(state.status).toBe('error');
      if (state.status === 'error') {
        expect(state.reason).toBe('emptyList');
      }
    });

    it('should set error on missing name', async () => {
      const file = createMockFile(mockData.MISSING_NAME);

      const scope = fork();

      await allSettled(importContactsModel.events.fileSelected, { scope, params: file });

      const state = scope.getState(importContactsModel.$importState);

      expect(state.status).toBe('error');
    });
  });

  describe('duplicate detection within file', () => {
    it('should enter duplicates resolution state when same address appears twice', async () => {
      const aliceAddress = mockData.VALID_CONTACTS[0]!.address;
      const file = createMockFile([
        { name: 'Alice', address: aliceAddress },
        { name: 'AliceClone', address: aliceAddress },
      ]);

      const scope = fork();

      await allSettled(importContactsModel.events.fileSelected, { scope, params: file });

      const state = scope.getState(importContactsModel.$importState);

      expect(state.status).toBe('duplicates');
      if (state.status === 'duplicates') {
        expect(state.duplicates).toHaveLength(1);
        expect(state.duplicates[0]!.names).toEqual(['Alice', 'AliceClone']);
      }
    });

    it('should import only the chosen entry after resolveDuplicates', async () => {
      const aliceAddress = mockData.VALID_CONTACTS[0]!.address;
      const file = createMockFile([
        { name: 'Alice', address: aliceAddress },
        { name: 'AliceClone', address: aliceAddress },
      ]);

      const aliceAccountId = toAccountId(aliceAddress);
      const mockCreate = vi.spyOn(contactModel.effects, 'createContactsFx').mockResolvedValue([]);
      mockCreate.mockClear();

      const scope = fork();

      await allSettled(importContactsModel.events.fileSelected, { scope, params: file });
      await allSettled(importContactsModel.events.resolveDuplicates, {
        scope,
        params: { [aliceAccountId]: 'AliceClone' },
      });

      expect(mockCreate).toHaveBeenCalledTimes(1);
      const createdContacts = mockCreate.mock.calls[0]![0];
      expect(createdContacts).toHaveLength(1);
      expect(createdContacts[0]!.name).toBe('AliceClone');

      const state = scope.getState(importContactsModel.$importState);
      expect(state.status).toBe('success');
    });

    it('should skip the address entirely when resolveDuplicates picks null', async () => {
      const aliceAddress = mockData.VALID_CONTACTS[0]!.address;
      const bobAddress = mockData.VALID_CONTACTS[1]!.address;
      const file = createMockFile([
        { name: 'Alice', address: aliceAddress },
        { name: 'AliceClone', address: aliceAddress },
        { name: 'Bob', address: bobAddress },
      ]);

      const aliceAccountId = toAccountId(aliceAddress);
      const mockCreate = vi.spyOn(contactModel.effects, 'createContactsFx').mockResolvedValue([]);
      mockCreate.mockClear();

      const scope = fork();

      await allSettled(importContactsModel.events.fileSelected, { scope, params: file });
      await allSettled(importContactsModel.events.resolveDuplicates, {
        scope,
        params: { [aliceAccountId]: null },
      });

      expect(mockCreate).toHaveBeenCalledTimes(1);
      const createdContacts = mockCreate.mock.calls[0]![0];
      expect(createdContacts).toHaveLength(1);
      expect(createdContacts[0]!.name).toBe('Bob');
    });

    it('should reset state on closeModal during duplicates resolution', async () => {
      const aliceAddress = mockData.VALID_CONTACTS[0]!.address;
      const file = createMockFile([
        { name: 'Alice', address: aliceAddress },
        { name: 'AliceClone', address: aliceAddress },
      ]);

      const mockCreate = vi.spyOn(contactModel.effects, 'createContactsFx').mockResolvedValue([]);
      mockCreate.mockClear();

      const scope = fork();

      await allSettled(importContactsModel.events.fileSelected, { scope, params: file });
      await allSettled(importContactsModel.events.closeModal, { scope });

      expect(mockCreate).not.toHaveBeenCalled();
      const state = scope.getState(importContactsModel.$importState);
      expect(state.status).toBe('idle');
    });
  });

  describe('conflict detection', () => {
    it('should detect accountId conflicts and show conflicts state', async () => {
      const aliceAddress = mockData.VALID_CONTACTS[0]!.address;
      const file = createMockFile([mockData.VALID_CONTACTS[0]]);

      const existingContacts = [
        localContact({
          id: 'test-uuid-1',
          name: 'OldAlice',
          address: toAddress(aliceAddress),
        }),
      ];

      const scope = fork({
        values: new Map().set(contactModel.$localContacts, existingContacts),
      });

      await allSettled(importContactsModel.events.fileSelected, { scope, params: file });

      const state = scope.getState(importContactsModel.$importState);

      expect(state.status).toBe('conflicts');
      if (state.status === 'conflicts') {
        expect(state.conflicts).toHaveLength(1);
        expect(state.conflicts[0]!.imported.name).toBe('Alice');
        expect(state.conflicts[0]!.existing.name).toBe('OldAlice');
      }
    });

    it('should not show conflicts when no accountId conflicts', async () => {
      const aliceAddress = mockData.VALID_CONTACTS[0]!.address;
      const bobAddress = mockData.VALID_CONTACTS[1]!.address;
      const file = createMockFile([mockData.VALID_CONTACTS[0]]);

      const existingContacts = [
        localContact({
          id: 'test-uuid-1',
          name: 'Bob',
          address: toAddress(bobAddress),
        }),
      ];

      // Mock the effects to prevent actual DB operations
      vi.spyOn(contactModel.effects, 'createContactsFx').mockResolvedValue([
        localContact({
          id: 'test-uuid-2',
          name: 'Alice',
          address: toAddress(aliceAddress),
        }),
      ]);

      const scope = fork({
        values: new Map().set(contactModel.$localContacts, existingContacts),
      });

      await allSettled(importContactsModel.events.fileSelected, { scope, params: file });

      const state = scope.getState(importContactsModel.$importState);

      expect(state.status).toBe('success');
    });
  });

  describe('replaceConflicts', () => {
    it('should replace existing contacts with imported ones', async () => {
      const aliceAddress = mockData.VALID_CONTACTS[0]!.address;
      const file = createMockFile([{ name: 'NewAlice', address: aliceAddress }]);

      const existingContacts = [
        localContact({
          id: 'test-uuid-1',
          name: 'OldAlice',
          address: toAddress(aliceAddress),
        }),
      ];

      const mockUpdate = vi.spyOn(contactModel.effects, 'updateContactsFx').mockResolvedValue([]);

      const scope = fork({
        values: new Map().set(contactModel.$localContacts, existingContacts),
      });

      await allSettled(importContactsModel.events.fileSelected, { scope, params: file });
      await allSettled(importContactsModel.events.replaceConflicts, { scope });

      expect(mockUpdate).toHaveBeenCalledWith([
        localContact({
          id: 'test-uuid-1',
          name: 'NewAlice',
          address: toAddress(aliceAddress),
        }),
      ]);

      const state = scope.getState(importContactsModel.$importState);
      expect(state.status).toBe('success');
    });
  });

  describe('keepCurrent', () => {
    it('should only import non-conflicting contacts', async () => {
      const aliceAddress = mockData.VALID_CONTACTS[0]!.address;
      const bobAddress = mockData.VALID_CONTACTS[1]!.address;
      const file = createMockFile([
        { name: 'Alice', address: aliceAddress },
        { name: 'Bob', address: bobAddress },
      ]);

      const existingContacts = [
        localContact({
          id: 'test-uuid-1',
          name: 'OldAlice',
          address: toAddress(aliceAddress),
        }),
      ];

      const mockCreate = vi.spyOn(contactModel.effects, 'createContactsFx').mockResolvedValue([
        localContact({
          id: 'test-uuid-2',
          name: 'Bob',
          address: toAddress(bobAddress),
        }),
      ]);

      const scope = fork({
        values: new Map().set(contactModel.$localContacts, existingContacts),
      });

      await allSettled(importContactsModel.events.fileSelected, { scope, params: file });
      await allSettled(importContactsModel.events.keepCurrent, { scope });

      expect(mockCreate).toHaveBeenCalledWith([
        {
          name: 'Bob',
          address: toAddress(bobAddress),
          accountId: toAccountId(bobAddress),
          source: 'local',
        },
      ]);

      const state = scope.getState(importContactsModel.$importState);
      expect(state.status).toBe('success');
      if (state.status === 'success') {
        expect(state.importedCount).toBe(1);
      }
    });
  });

  describe('name conflict resolution', () => {
    it('should auto-resolve name conflicts with (1), (2), (3) suffixes', async () => {
      const file = createMockFile(mockData.SIMILAR_NAMES);

      const mockCreate = vi.spyOn(contactModel.effects, 'createContactsFx').mockResolvedValue([]);

      const scope = fork();

      await allSettled(importContactsModel.events.fileSelected, { scope, params: file });

      expect(mockCreate).toHaveBeenCalledWith([
        {
          name: 'first',
          address: toAddress(mockData.SIMILAR_NAMES[0]!.address),
          accountId: toAccountId(mockData.SIMILAR_NAMES[0]!.address),
          source: 'local',
        },
        {
          name: 'first (1)',
          address: toAddress(mockData.SIMILAR_NAMES[1]!.address),
          accountId: toAccountId(mockData.SIMILAR_NAMES[1]!.address),
          source: 'local',
        },
        {
          name: 'first (2)',
          address: toAddress(mockData.SIMILAR_NAMES[2]!.address),
          accountId: toAccountId(mockData.SIMILAR_NAMES[2]!.address),
          source: 'local',
        },
      ]);

      const state = scope.getState(importContactsModel.$importState);
      expect(state.status).toBe('success');
    });
  });

  describe('state reset', () => {
    it('should reset state on closeModal', async () => {
      const file = createMockFile(mockData.VALID_CONTACTS);

      const scope = fork();

      await allSettled(importContactsModel.events.fileSelected, { scope, params: file });
      await allSettled(importContactsModel.events.closeModal, { scope });

      const state = scope.getState(importContactsModel.$importState);
      expect(state.status).toBe('idle');
    });

    it('should reset state on resetState event', async () => {
      const file = createMockFile(mockData.VALID_CONTACTS);

      const scope = fork();

      await allSettled(importContactsModel.events.fileSelected, { scope, params: file });
      await allSettled(importContactsModel.events.resetState, { scope });

      const state = scope.getState(importContactsModel.$importState);
      expect(state.status).toBe('idle');
    });
  });
});
