import { useCallback } from 'react';

import { type ChainId } from '@/shared/core';
import { useResource } from '@/shared/query';

import { operationTemplatesResource } from './resource';
import { operationTemplateService } from './service';
import { type NewOperationTemplate, type OperationTemplate } from './types';

export const useTemplates = (chainId: ChainId | null) => {
  return useResource(operationTemplatesResource, {
    params: chainId,
    defaultValue: [] as OperationTemplate[],
    map: (cache, key) => cache[key],
  });
};

export const useAllTemplates = () => {
  return useResource(operationTemplatesResource.all, {
    params: 'all' as const,
    defaultValue: [] as OperationTemplate[],
    map: cache => cache ?? [],
  });
};

export const useTemplateMutations = () => {
  const save = useCallback(async (input: NewOperationTemplate): Promise<OperationTemplate | undefined> => {
    const created = await operationTemplateService.create(input);
    if (created) {
      operationTemplatesResource.templateCreated(created);
    }

    return created;
  }, []);

  const rename = useCallback(async (template: OperationTemplate, name: string) => {
    const updatedId = await operationTemplateService.rename(template.id, name);
    if (updatedId !== undefined) {
      operationTemplatesResource.templateRenamed({ id: template.id, chainId: template.chainId, name });
    }
  }, []);

  const remove = useCallback(async (template: OperationTemplate) => {
    const removedId = await operationTemplateService.remove(template.id);
    if (removedId !== undefined) {
      operationTemplatesResource.templateRemoved({ id: template.id, chainId: template.chainId });
    }
  }, []);

  return { save, rename, remove };
};
