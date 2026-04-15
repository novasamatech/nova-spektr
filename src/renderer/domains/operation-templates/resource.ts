import { createEvent, createStore } from 'effector';

import { createQueryResource } from '@/shared/query';

import { operationTemplateService } from './service';
import { type OperationTemplate } from './types';

const $cache = createStore<OperationTemplate[] | null>(null);

const resource = createQueryResource<'all'>({
  key: p => [p],
})
  .name('operation-templates')
  .request(async () => operationTemplateService.getAll())
  .cache({
    store: $cache,
    map: (_state, results) => results,
  })
  .build();

const templateCreated = createEvent<OperationTemplate>();
$cache.on(templateCreated, (state, template) => (state ? [template, ...state] : state));

const templateRenamed = createEvent<{ id: number; name: string }>();
$cache.on(templateRenamed, (state, { id, name }) =>
  state ? state.map(t => (t.id === id ? { ...t, name } : t)) : state,
);

const templateRemoved = createEvent<{ id: number }>();
$cache.on(templateRemoved, (state, { id }) => (state ? state.filter(t => t.id !== id) : state));

export const operationTemplatesResource = {
  ...resource,
  templateCreated,
  templateRenamed,
  templateRemoved,
};
