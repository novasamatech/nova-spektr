import { describe, expect, it, vi } from 'vitest';

import { StorageService } from './storageService';

describe('StorageService', () => {
  it('updates many records in one bulk operation', async () => {
    const table = {
      bulkUpdate: vi.fn().mockResolvedValue(2),
      update: vi.fn(),
      db: {
        transaction: vi.fn(),
      },
    };
    const service = new StorageService<{ id: number; value: string }, number>(table as never);

    const result = await service.updateAll([
      { id: 1, value: 'one' },
      { id: 2, value: 'two' },
    ]);

    expect(result).toEqual([1, 2]);
    expect(table.bulkUpdate).toHaveBeenCalledWith([
      { key: 1, changes: { value: 'one' } },
      { key: 2, changes: { value: 'two' } },
    ]);
    expect(table.db.transaction).not.toHaveBeenCalled();
    expect(table.update).not.toHaveBeenCalled();
  });

  it('falls back to transactional updates when bulk update is unavailable', async () => {
    const table = {
      bulkUpdate: vi.fn().mockRejectedValue(new TypeError('bulk update unavailable')),
      db: {
        transaction: vi.fn((_mode, _table, callback) => callback()),
      },
      update: vi.fn().mockResolvedValue(1),
    };
    const service = new StorageService<{ id: number; value: string }, number>(table as never);

    const result = await service.updateAll([
      { id: 1, value: 'one' },
      { id: 2, value: 'two' },
    ]);

    expect(result).toEqual([1, 2]);
    expect(table.db.transaction).toHaveBeenCalledWith('rw', table, expect.any(Function));
    expect(table.update).toHaveBeenCalledTimes(2);
    expect(table.update).toHaveBeenNthCalledWith(1, 1, { id: 1, value: 'one' });
    expect(table.update).toHaveBeenNthCalledWith(2, 2, { id: 2, value: 'two' });
  });
});
