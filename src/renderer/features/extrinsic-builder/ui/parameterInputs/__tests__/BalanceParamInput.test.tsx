import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import { BalanceParamInput } from '../BalanceParamInput';

vi.mock('@/shared/i18n', () => ({
  useI18n: () => ({
    t: (key: string, params?: Record<string, string>) => (params ? `${key}:${params['amount']}` : key),
  }),
}));

const type = (value: string) => fireEvent.change(screen.getByRole('textbox'), { target: { value } });

const dot = { precision: 2, symbol: 'DOT' };

describe('BalanceParamInput', () => {
  describe('with a known unit', () => {
    it('accepts a positive decimal', () => {
      const onChange = vi.fn();
      render(<BalanceParamInput value="" unit={dot} onChange={onChange} />);

      type('1.5');

      expect(onChange).toHaveBeenCalledWith('1.5');
    });

    it.each(['-1.5', '-', '-0.1', '1,5', '1e5'])('rejects %s', (value) => {
      const onChange = vi.fn();
      render(<BalanceParamInput value="" unit={dot} onChange={onChange} />);

      type(value);

      expect(onChange).not.toHaveBeenCalled();
    });

    it('accepts decimals up to the unit precision', () => {
      const onChange = vi.fn();
      render(<BalanceParamInput value="" unit={dot} onChange={onChange} />);

      type('1.25');

      expect(onChange).toHaveBeenCalledWith('1.25');
    });

    it('refuses a keystroke that exceeds the unit precision', () => {
      const onChange = vi.fn();
      render(<BalanceParamInput value="1.25" unit={dot} onChange={onChange} />);

      type('1.255');

      expect(onChange).not.toHaveBeenCalled();
    });

    it('does not cap the integer part', () => {
      const onChange = vi.fn();
      render(<BalanceParamInput value="" unit={dot} onChange={onChange} />);

      type('1234567890123456');

      expect(onChange).toHaveBeenCalledWith('1234567890123456');
    });

    it('shows the unit symbol and the resulting base-unit value', () => {
      render(<BalanceParamInput value="1.5" unit={{ precision: 6, symbol: 'USDT' }} onChange={vi.fn()} />);

      expect(screen.getByText('USDT')).toBeInTheDocument();
      expect(screen.getByText('extrinsicBuilder.baseUnitsPreview:1500000')).toBeInTheDocument();
    });
  });

  describe('without a known unit', () => {
    it('is labelled as base units', () => {
      render(<BalanceParamInput value="" unit={null} onChange={vi.fn()} />);

      expect(screen.getByText('extrinsicBuilder.baseUnits')).toBeInTheDocument();
    });

    it('accepts whole base units', () => {
      const onChange = vi.fn();
      render(<BalanceParamInput value="" unit={null} onChange={onChange} />);

      type('1500000');

      expect(onChange).toHaveBeenCalledWith('1500000');
    });

    it.each(['1.5', '1.', '-1'])('refuses %s', (value) => {
      const onChange = vi.fn();
      render(<BalanceParamInput value="" unit={null} onChange={onChange} />);

      type(value);

      expect(onChange).not.toHaveBeenCalled();
    });
  });
});
