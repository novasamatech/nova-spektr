import { type ApiPromise } from '@polkadot/api';
import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import { BalanceParamInput } from '../BalanceParamInput';

const type = (value: string) => fireEvent.change(screen.getByRole('textbox'), { target: { value } });

const api = { registry: { chainDecimals: [2], chainTokens: ['DOT'] } } as unknown as ApiPromise;

describe('BalanceParamInput', () => {
  it('accepts a positive decimal', () => {
    const onChange = vi.fn();
    render(<BalanceParamInput value="" api={null} onChange={onChange} />);

    type('1.5');

    expect(onChange).toHaveBeenCalledWith('1.5');
  });

  it.each(['-1.5', '-', '-0.1', '1,5', '1e5'])('rejects %s', (value) => {
    const onChange = vi.fn();
    render(<BalanceParamInput value="" api={null} onChange={onChange} />);

    type(value);

    expect(onChange).not.toHaveBeenCalled();
  });

  it('accepts decimals up to the chain precision', () => {
    const onChange = vi.fn();
    render(<BalanceParamInput value="" api={api} onChange={onChange} />);

    type('1.25');

    expect(onChange).toHaveBeenCalledWith('1.25');
  });

  it('refuses a keystroke that exceeds the chain precision', () => {
    const onChange = vi.fn();
    render(<BalanceParamInput value="1.25" api={api} onChange={onChange} />);

    type('1.255');

    expect(onChange).not.toHaveBeenCalled();
  });

  it('does not cap the integer part', () => {
    const onChange = vi.fn();
    render(<BalanceParamInput value="" api={api} onChange={onChange} />);

    type('1234567890123456');

    expect(onChange).toHaveBeenCalledWith('1234567890123456');
  });
});
