import { createEvent, createStore } from 'effector';

import { type ChainId } from '@/shared/core';
import { createQueryResource } from '@/shared/query';

import { operationTemplateService } from './service';
import { type OperationTemplate } from './types';

type ChainCache = Record<ChainId, OperationTemplate[]>;

const $cache = createStore<ChainCache>({});

const resource = createQueryResource<ChainId>({
  key: chainId => [chainId],
})
  .name('operation-templates')
  .request(async (chainId, _signal) => operationTemplateService.getAllByChain(chainId))
  .cache({
    store: $cache,
    map: (state, results, chainId) => ({ ...state, [chainId]: results }),
  })
  .build();

const $allCache = createStore<OperationTemplate[] | null>(null);

const allResource = createQueryResource<'all'>({
  key: p => [p],
})
  .name('operation-templates-all')
  .request(async () => operationTemplateService.getAll())
  .cache({
    store: $allCache,
    map: (_state, results) => results,
  })
  .build();

const templateCreated = createEvent<OperationTemplate>();
$cache.on(templateCreated, (state, template) => ({
  ...state,
  [template.chainId]: [template, ...(state[template.chainId] ?? [])],
}));
$allCache.on(templateCreated, (state, template) => (state ? [template, ...state] : state));

const templateRenamed = createEvent<{ id: number; chainId: ChainId; name: string }>();
$cache.on(templateRenamed, (state, { id, chainId, name }) => ({
  ...state,
  [chainId]: (state[chainId] ?? []).map(t => (t.id === id ? { ...t, name } : t)),
}));
$allCache.on(templateRenamed, (state, { id, name }) =>
  state ? state.map(t => (t.id === id ? { ...t, name } : t)) : state,
);

const templateRemoved = createEvent<{ id: number; chainId: ChainId }>();
$cache.on(templateRemoved, (state, { id, chainId }) => ({
  ...state,
  [chainId]: (state[chainId] ?? []).filter(t => t.id !== id),
}));
$allCache.on(templateRemoved, (state, { id }) => (state ? state.filter(t => t.id !== id) : state));

export const operationTemplatesResource = {
  ...resource,
  all: allResource,
  templateCreated,
  templateRenamed,
  templateRemoved,
};
