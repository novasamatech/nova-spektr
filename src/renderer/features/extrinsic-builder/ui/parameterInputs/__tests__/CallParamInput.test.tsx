import { type ApiPromise } from '@polkadot/api';
import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import { CallParamInput } from '../CallParamInput';

vi.mock('@/shared/i18n', () => ({
  useI18n: () => ({ t: (key: string) => key }),
}));

const encodeCallData = vi.fn();

vi.mock('../../../lib/extrinsicBuilder', () => ({
  getPalletNames: () => ['system'],
  getCallNames: () => ['remark'],
  getCallMeta: () => ({
    args: [{ name: 'nonce', typeDef: { kind: 'primitive', typeName: 'u32', primitiveType: 'u32' } }],
    docs: [],
  }),
  parseCallData: () => ({ pallet: 'system', call: 'remark', args: { nonce: '1' } }),
  encodeCallData: (...args: unknown[]) => encodeCallData(...args),
}));

const api = { registry: { chainDecimals: [10], chainTokens: ['DOT'] } } as unknown as ApiPromise;

const renderNested = () => {
  const onChange = vi.fn();
  render(<CallParamInput api={api} value="0xdead" depth={0} onChange={onChange} />);
  const nonce = screen.getByDisplayValue('1');

  return { onChange, nonce };
};

describe('CallParamInput', () => {
  it('propagates the encoded inner call', () => {
    encodeCallData.mockReturnValue('0xbeef');
    const { onChange, nonce } = renderNested();

    fireEvent.change(nonce, { target: { value: '2' } });

    expect(onChange).toHaveBeenCalledWith('0xbeef');
  });

  it('propagates null when the inner call fails to encode, so the outer call cannot keep stale data', () => {
    encodeCallData.mockReturnValue(null);
    const { onChange, nonce } = renderNested();

    fireEvent.change(nonce, { target: { value: '2' } });

    expect(onChange).toHaveBeenCalledWith(null);
  });
});
