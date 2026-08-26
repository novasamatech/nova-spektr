import { describe, expect, it } from 'vitest';

import { createAccountId } from '@/shared/mocks';
import { type PathSource } from '../model/graph-model';

import { sourceToNode } from './source-node';

const ID = createAccountId('source');

describe('sourceToNode', () => {
  it.each([
    ['proxied', 'proxied'],
    ['multisig', 'multisig'],
    ['signer', 'signer'],
  ] as const)('a %s source opens a %s node', (kind, expected) => {
    const source: PathSource = { accountId: ID, name: 'x', kind };

    expect(sourceToNode(source)).toEqual({ kind: expected, accountId: ID });
  });
});
