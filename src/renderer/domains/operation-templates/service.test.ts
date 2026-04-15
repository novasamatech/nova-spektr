import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { type ChainId } from '@/shared/core';

import { operationTemplateService } from './service';
import { type OperationTemplate } from './types';

const create = vi.fn();
const readAll = vi.fn();
const update = vi.fn();
const remove = vi.fn();

vi.mock('@/shared/api/storage', async importOriginal => {
  // eslint-disable-next-line @typescript-eslint/consistent-type-imports
  const actual = await importOriginal<typeof import('@/shared/api/storage')>();

  return {
    ...actual,
    storageService: {
      operationTemplates: {
        create: (...args: unknown[]) => create(...args),
        readAll: (...args: unknown[]) => readAll(...args),
        update: (...args: unknown[]) => update(...args),
        delete: (...args: unknown[]) => remove(...args),
      },
    },
  };
});

const CHAIN_A = '0xaaaa' as ChainId;
const CHAIN_B = '0xbbbb' as ChainId;

const fixture = (overrides: Partial<OperationTemplate> = {}): OperationTemplate => ({
  id: 1,
  name: 'tpl',
  chainId: CHAIN_A,
  callData: '0xdeadbeef',
  specVersion: 1,
  createdAt: 100,
  ...overrides,
});

describe('operationTemplateService', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-01-01T00:00:00Z'));
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.clearAllMocks();
  });

  describe('getAll', () => {
    it('sorts results by createdAt desc', async () => {
      const a = fixture({ id: 1, createdAt: 10 });
      const b = fixture({ id: 2, createdAt: 30 });
      const c = fixture({ id: 3, createdAt: 20 });
      readAll.mockResolvedValueOnce([a, b, c]);

      const result = await operationTemplateService.getAll();

      expect(result.map(t => t.id)).toEqual([2, 3, 1]);
    });

    it('returns empty list when storage is empty', async () => {
      readAll.mockResolvedValueOnce([]);
      await expect(operationTemplateService.getAll()).resolves.toEqual([]);
    });
  });

  describe('getAllByChain', () => {
    it('keeps only the requested chain and preserves order', async () => {
      readAll.mockResolvedValueOnce([
        fixture({ id: 1, chainId: CHAIN_A, createdAt: 10 }),
        fixture({ id: 2, chainId: CHAIN_B, createdAt: 20 }),
        fixture({ id: 3, chainId: CHAIN_A, createdAt: 30 }),
      ]);

      const result = await operationTemplateService.getAllByChain(CHAIN_A);

      expect(result.map(t => t.id)).toEqual([3, 1]);
    });

    it('returns [] when no template matches the chain', async () => {
      readAll.mockResolvedValueOnce([fixture({ chainId: CHAIN_B })]);
      await expect(operationTemplateService.getAllByChain(CHAIN_A)).resolves.toEqual([]);
    });
  });

  describe('create', () => {
    it('stamps createdAt with the current timestamp', async () => {
      create.mockResolvedValueOnce(undefined);

      await operationTemplateService.create({
        name: 'n',
        chainId: CHAIN_A,
        callData: '0xab',
        specVersion: 5,
      });

      expect(create).toHaveBeenCalledWith({
        name: 'n',
        chainId: CHAIN_A,
        callData: '0xab',
        specVersion: 5,
        createdAt: new Date('2026-01-01T00:00:00Z').getTime(),
      });
    });

    it('returns the created template from storage', async () => {
      const created = fixture({ id: 42 });
      create.mockResolvedValueOnce(created);

      await expect(
        operationTemplateService.create({
          name: created.name,
          chainId: created.chainId,
          callData: created.callData,
          specVersion: created.specVersion,
        }),
      ).resolves.toBe(created);
    });
  });

  describe('rename', () => {
    it('forwards id and name patch to storage', async () => {
      update.mockResolvedValueOnce(7);
      await operationTemplateService.rename(7, 'new');
      expect(update).toHaveBeenCalledWith(7, { name: 'new' });
    });

    it('propagates undefined when storage signals no-op', async () => {
      update.mockResolvedValueOnce(undefined);
      await expect(operationTemplateService.rename(7, 'new')).resolves.toBeUndefined();
    });
  });

  describe('remove', () => {
    it('forwards id to storage delete', async () => {
      remove.mockResolvedValueOnce(9);
      await expect(operationTemplateService.remove(9)).resolves.toBe(9);
      expect(remove).toHaveBeenCalledWith(9);
    });
  });
});
