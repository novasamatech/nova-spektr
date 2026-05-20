import { createEvent, createStore } from 'effector';

import { type PathNode } from '@/domains/backend';
import { MAX_PATH_DEPTH, isCycleFreeAppend, isValidPathPrefix } from '../lib/path-validation';

const pathReset = createEvent();
const pathNodeAppended = createEvent<PathNode>();
const pathTruncatedTo = createEvent<number>();
const pathSeeded = createEvent<PathNode[]>();
const pathSourceProxyTypeSet = createEvent<string>();

const $path = createStore<PathNode[]>([])
  .on(pathReset, () => [])
  .on(pathTruncatedTo, (path, index) => {
    if (index < 0) return [];
    if (index >= path.length) return path;
    return path.slice(0, index + 1);
  })
  .on(pathSeeded, (prev, next) => (isValidPathPrefix(next).ok ? next : prev))
  .on(pathNodeAppended, (path, next) => {
    if (path.length >= MAX_PATH_DEPTH) return path;
    if (!isCycleFreeAppend(path, next)) return path;
    return [...path, next];
  })
  .on(pathSourceProxyTypeSet, (path, proxyType) => {
    const first = path[0];
    if (!first || first.kind !== 'proxied') return path;
    return [{ ...first, proxyType }, ...path.slice(1)];
  });

const $isComplete = $path.map((path) => path.length > 0 && path[path.length - 1]!.kind === 'signer');

const $lastNode = $path.map((path) => (path.length === 0 ? null : path[path.length - 1]!));

const $sourceKind = $path.map((path) => (path.length === 0 ? null : path[0]!.kind));

export const pathModel = {
  pathReset,
  pathNodeAppended,
  pathTruncatedTo,
  pathSeeded,
  pathSourceProxyTypeSet,
  $path,
  $isComplete,
  $lastNode,
  $sourceKind,
};
