import { BN } from '@polkadot/util';
import { describe, expect, it } from 'vitest';

import { createAccountId } from '@/shared/mocks';

import { type Delegation } from './summarizeAccountLocks';
import { buildUndelegateActions } from './undelegateActions';

const delegation = (trackId: string, conviction: Delegation['conviction']): Delegation => ({
  trackId,
  target: createAccountId('delegate'),
  balance: new BN(10),
  conviction,
});

describe('buildUndelegateActions', () => {
  it('undelegates every track, then unlocks the ones without conviction', () => {
    expect(buildUndelegateActions([delegation('20', 'None'), delegation('21', 'Locked2x')])).toEqual([
      { type: 'undelegate', trackId: '20' },
      { type: 'undelegate', trackId: '21' },
      { type: 'unlock', trackId: '20' },
    ]);
  });

  it('is empty without delegations', () => {
    expect(buildUndelegateActions([])).toEqual([]);
  });
});
