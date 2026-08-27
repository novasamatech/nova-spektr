import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import { BalanceParamInput } from '../BalanceParamInput';
import { NumberParamInput } from '../NumberParamInput';

const type = (value: string) => fireEvent.change(screen.getByRole('textbox'), { target: { value } });

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
});

describe('NumberParamInput', () => {
  it('accepts a minus for signed ints', () => {
    const onChange = vi.fn();
    render(<NumberParamInput value="" signed onChange={onChange} />);

    type('-5');

    expect(onChange).toHaveBeenCalledWith('-5');
  });

  it.each(['-', '-5'])('rejects %s for unsigned ints', (value) => {
    const onChange = vi.fn();
    render(<NumberParamInput value="" onChange={onChange} />);

    type(value);

    expect(onChange).not.toHaveBeenCalled();
  });
});
