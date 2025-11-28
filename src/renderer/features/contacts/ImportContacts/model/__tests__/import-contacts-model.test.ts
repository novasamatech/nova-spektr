import { allSettled, fork } from 'effector';
import { describe, expect, it, vi } from 'vitest';

import { toAccountId, toAddress } from '@/shared/lib/utils';
import { contactModel } from '@/entities/contact';
import { importContactsModel } from '../import-contacts-model';

import * as mockData from './mocks/import-data';

const createMockFile = (data: unknown): File => {
  const content = typeof data === 'string' ? data : JSON.stringify(data);
  return new File([content], 'contacts.json', { type: 'application/json' });
};

describe('importContactsModel', () => {
  describe('parseFileFx', () => {
    it('should parse valid contacts from Polkadot.js export', async () => {
      const file = createMockFile(mockData.VALID_CONTACTS);

      const scope = fork();

      await allSettled(importContactsModel.events.fileSelected, { scope, params: file });

      const parsedContacts = scope.getState(importContactsModel.$parsedContacts);
      const hasError = scope.getState(importContactsModel.$hasError);

      expect(parsedContacts).toHaveLength(3);
      expect(parsedContacts?.[0].name).toBe('Alice');
      expect(parsedContacts?.[0].address).toBe('15oF4uVJwmo4TdGW7VfQxNLavjCXviqxT9S1MgbjMNHr6Sp5');
      expect(parsedContacts?.[1].name).toBe('Bob');
      expect(parsedContacts?.[2].name).toBe('Charlie');
      expect(hasError).toBe(false);
    });

    it('should accept contacts with only name and address fields', async () => {
      const file = createMockFile(mockData.ONLY_NAME_AND_ADDRESS);

      const scope = fork();

      await allSettled(importContactsModel.events.fileSelected, { scope, params: file });

      const parsedContacts = scope.getState(importContactsModel.$parsedContacts);
      const hasError = scope.getState(importContactsModel.$hasError);

      expect(parsedContacts).toHaveLength(1);
      expect(parsedContacts?.[0].name).toBe('gav');
      expect(hasError).toBe(false);
    });

    it('should accept contacts with additional parameters', async () => {
      const file = createMockFile(mockData.ADDITIONAL_PARAMS);

      const scope = fork();

      await allSettled(importContactsModel.events.fileSelected, { scope, params: file });

      const parsedContacts = scope.getState(importContactsModel.$parsedContacts);
      const hasError = scope.getState(importContactsModel.$hasError);

      expect(parsedContacts).toHaveLength(1);
      expect(parsedContacts?.[0].name).toBe('gav');
      expect(hasError).toBe(false);
    });

    it('should set hasError on invalid JSON', async () => {
      const file = createMockFile(mockData.INVALID_JSON);

      const scope = fork();

      await allSettled(importContactsModel.events.fileSelected, { scope, params: file });

      const hasError = scope.getState(importContactsModel.$hasError);
      const parsedContacts = scope.getState(importContactsModel.$parsedContacts);

      expect(hasError).toBe(true);
      expect(parsedContacts).toBeNull();
    });

    it('should set hasError on non-array data', async () => {
      const file = createMockFile(mockData.NOT_ARRAY);

      const scope = fork();

      await allSettled(importContactsModel.events.fileSelected, { scope, params: file });

      const hasError = scope.getState(importContactsModel.$hasError);
      const parsedContacts = scope.getState(importContactsModel.$parsedContacts);

      expect(hasError).toBe(true);
      expect(parsedContacts).toBeNull();
    });

    it('should set hasError and isEmptyList on empty array', async () => {
      const file = createMockFile(mockData.EMPTY_ARRAY);

      const scope = fork();

      await allSettled(importContactsModel.events.fileSelected, { scope, params: file });

      const hasError = scope.getState(importContactsModel.$hasError);
      const isEmptyList = scope.getState(importContactsModel.$isEmptyList);

      expect(hasError).toBe(true);
      expect(isEmptyList).toBe(true);
    });

    it('should set hasError on missing name', async () => {
      const file = createMockFile(mockData.MISSING_NAME);

      const scope = fork();

      await allSettled(importContactsModel.events.fileSelected, { scope, params: file });

      const hasError = scope.getState(importContactsModel.$hasError);
      const parsedContacts = scope.getState(importContactsModel.$parsedContacts);

      expect(hasError).toBe(true);
      expect(parsedContacts).toBeNull();
    });
  });

  describe('conflict detection', () => {
    it('should detect accountId conflicts and show conflicts modal', async () => {
      const aliceAddress = mockData.VALID_CONTACTS[0].address;
      const file = createMockFile([mockData.VALID_CONTACTS[0]]);

      const existingContacts = [
        {
          id: 1,
          name: 'OldAlice',
          address: toAddress(aliceAddress),
          accountId: toAccountId(aliceAddress),
        },
      ];

      const scope = fork({
        values: new Map().set(contactModel.$contacts, existingContacts),
      });

      await allSettled(importContactsModel.events.fileSelected, { scope, params: file });

      const showConflicts = scope.getState(importContactsModel.$showConflicts);
      const conflicts = scope.getState(importContactsModel.$accountIdConflicts);

      expect(showConflicts).toBe(true);
      expect(conflicts).toHaveLength(1);
      expect(conflicts[0].imported.name).toBe('Alice');
      expect(conflicts[0].existing.name).toBe('OldAlice');
    });

    it('should not show conflicts when no accountId conflicts', async () => {
      const aliceAddress = mockData.VALID_CONTACTS[0].address;
      const bobAddress = mockData.VALID_CONTACTS[1].address;
      const file = createMockFile([mockData.VALID_CONTACTS[0]]);

      const existingContacts = [
        {
          id: 1,
          name: 'Bob',
          address: toAddress(bobAddress),
          accountId: toAccountId(bobAddress),
        },
      ];

      // Mock the effects to prevent actual DB operations
      vi.spyOn(contactModel.effects, 'createContactsFx').mockResolvedValue([
        {
          id: 2,
          name: 'Alice',
          address: toAddress(aliceAddress),
          accountId: toAccountId(aliceAddress),
        },
      ]);

      const scope = fork({
        values: new Map().set(contactModel.$contacts, existingContacts),
      });

      await allSettled(importContactsModel.events.fileSelected, { scope, params: file });

      const showConflicts = scope.getState(importContactsModel.$showConflicts);
      const hasSuccess = scope.getState(importContactsModel.$hasSuccess);

      expect(showConflicts).toBe(false);
      expect(hasSuccess).toBe(true);
    });
  });

  describe('replaceConflicts', () => {
    it('should replace existing contacts with imported ones', async () => {
      const aliceAddress = mockData.VALID_CONTACTS[0].address;
      const file = createMockFile([{ name: 'NewAlice', address: aliceAddress }]);

      const existingContacts = [
        {
          id: 1,
          name: 'OldAlice',
          address: toAddress(aliceAddress),
          accountId: toAccountId(aliceAddress),
        },
      ];

      const mockUpdate = vi.spyOn(contactModel.effects, 'updateContactsFx').mockResolvedValue([]);

      const scope = fork({
        values: new Map().set(contactModel.$contacts, existingContacts),
      });

      await allSettled(importContactsModel.events.fileSelected, { scope, params: file });
      await allSettled(importContactsModel.events.replaceConflicts, { scope });

      expect(mockUpdate).toHaveBeenCalledWith([
        {
          id: 1,
          name: 'NewAlice',
          address: toAddress(aliceAddress),
          accountId: toAccountId(aliceAddress),
        },
      ]);

      const hasSuccess = scope.getState(importContactsModel.$hasSuccess);
      expect(hasSuccess).toBe(true);
    });
  });

  describe('keepCurrent', () => {
    it('should only import non-conflicting contacts', async () => {
      const aliceAddress = mockData.VALID_CONTACTS[0].address;
      const bobAddress = mockData.VALID_CONTACTS[1].address;
      const file = createMockFile([
        { name: 'Alice', address: aliceAddress },
        { name: 'Bob', address: bobAddress },
      ]);

      const existingContacts = [
        {
          id: 1,
          name: 'OldAlice',
          address: toAddress(aliceAddress),
          accountId: toAccountId(aliceAddress),
        },
      ];

      const mockCreate = vi.spyOn(contactModel.effects, 'createContactsFx').mockResolvedValue([
        {
          id: 2,
          name: 'Bob',
          address: toAddress(bobAddress),
          accountId: toAccountId(bobAddress),
        },
      ]);

      const scope = fork({
        values: new Map().set(contactModel.$contacts, existingContacts),
      });

      await allSettled(importContactsModel.events.fileSelected, { scope, params: file });
      await allSettled(importContactsModel.events.keepCurrent, { scope });

      expect(mockCreate).toHaveBeenCalledWith([
        {
          name: 'Bob',
          address: toAddress(bobAddress),
          accountId: toAccountId(bobAddress),
        },
      ]);

      const hasSuccess = scope.getState(importContactsModel.$hasSuccess);
      const importedCount = scope.getState(importContactsModel.$importedCount);
      expect(hasSuccess).toBe(true);
      expect(importedCount).toBe(1);
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
          address: toAddress(mockData.SIMILAR_NAMES[0].address),
          accountId: toAccountId(mockData.SIMILAR_NAMES[0].address),
        },
        {
          name: 'first (1)',
          address: toAddress(mockData.SIMILAR_NAMES[1].address),
          accountId: toAccountId(mockData.SIMILAR_NAMES[1].address),
        },
        {
          name: 'first (2)',
          address: toAddress(mockData.SIMILAR_NAMES[2].address),
          accountId: toAccountId(mockData.SIMILAR_NAMES[2].address),
        },
      ]);

      const hasSuccess = scope.getState(importContactsModel.$hasSuccess);
      expect(hasSuccess).toBe(true);
    });
  });

  describe('state reset', () => {
    it('should reset state on closeModal', async () => {
      const file = createMockFile(mockData.VALID_CONTACTS);

      const scope = fork();

      await allSettled(importContactsModel.events.fileSelected, { scope, params: file });
      await allSettled(importContactsModel.events.closeModal, { scope });

      const parsedContacts = scope.getState(importContactsModel.$parsedContacts);
      const conflicts = scope.getState(importContactsModel.$accountIdConflicts);
      const isLoading = scope.getState(importContactsModel.$isLoading);
      const hasError = scope.getState(importContactsModel.$hasError);
      const hasSuccess = scope.getState(importContactsModel.$hasSuccess);
      const showConflicts = scope.getState(importContactsModel.$showConflicts);

      expect(parsedContacts).toBeNull();
      expect(conflicts).toHaveLength(0);
      expect(isLoading).toBe(false);
      expect(hasError).toBe(false);
      expect(hasSuccess).toBe(false);
      expect(showConflicts).toBe(false);
    });

    it('should reset state on resetState event', async () => {
      const file = createMockFile(mockData.VALID_CONTACTS);

      const scope = fork();

      await allSettled(importContactsModel.events.fileSelected, { scope, params: file });
      await allSettled(importContactsModel.events.resetState, { scope });

      const parsedContacts = scope.getState(importContactsModel.$parsedContacts);
      const conflicts = scope.getState(importContactsModel.$accountIdConflicts);
      const isLoading = scope.getState(importContactsModel.$isLoading);
      const hasError = scope.getState(importContactsModel.$hasError);
      const hasSuccess = scope.getState(importContactsModel.$hasSuccess);
      const showConflicts = scope.getState(importContactsModel.$showConflicts);

      expect(parsedContacts).toBeNull();
      expect(conflicts).toHaveLength(0);
      expect(isLoading).toBe(false);
      expect(hasError).toBe(false);
      expect(hasSuccess).toBe(false);
      expect(showConflicts).toBe(false);
    });
  });
});
