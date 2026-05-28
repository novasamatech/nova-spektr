import { describe, expect, it } from 'vitest';

import { type HexString } from '@/shared/core';

import { getCallDetailsLabelKeys } from './OperationAdvancedDetails';

describe('getCallDetailsLabelKeys', () => {
  const callHash = '0x1234' as HexString;

  it('uses regular call labels when the displayed call was not unwrapped', () => {
    expect(getCallDetailsLabelKeys({ callHash }, { callHash })).toEqual({
      callHash: 'operation.details.callHash',
      callData: 'operation.details.callData',
    });
  });

  it('uses core call labels when the displayed call was unwrapped from an outer call', () => {
    expect(getCallDetailsLabelKeys({ callHash: '0xabcd' as HexString }, { callHash })).toEqual({
      callHash: 'operation.details.coreCallHash',
      callData: 'operation.details.coreCallData',
    });
  });
});
