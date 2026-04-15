import { storageService } from '@/shared/api/storage';
import { type ChainId } from '@/shared/core';

import { type NewOperationTemplate, type OperationTemplate } from './types';

const getAll = async (): Promise<OperationTemplate[]> => {
  const all = await storageService.operationTemplates.readAll();

  return all.sort((a, b) => b.createdAt - a.createdAt);
};

const getAllByChain = async (chainId: ChainId): Promise<OperationTemplate[]> => {
  const all = await getAll();

  return all.filter(t => t.chainId === chainId);
};

const create = async (input: NewOperationTemplate): Promise<OperationTemplate | undefined> => {
  return storageService.operationTemplates.create({
    ...input,
    createdAt: Date.now(),
  });
};

const rename = async (id: number, name: string): Promise<number | undefined> => {
  return storageService.operationTemplates.update(id, { name });
};

const remove = async (id: number): Promise<number | undefined> => {
  return storageService.operationTemplates.delete(id);
};

export const operationTemplateService = {
  getAll,
  getAllByChain,
  create,
  rename,
  remove,
};
