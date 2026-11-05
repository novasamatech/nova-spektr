import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import { type ParameterTypeDef } from '../../../lib/types';
import { EnumParamInput } from '../EnumParamInput';

vi.mock('@/shared/i18n', () => ({
  useI18n: () => ({ t: (key: string) => key }),
}));

const balance: ParameterTypeDef = { kind: 'balance', typeName: 'Balance' };

// AccountVote { Standard { vote, balance }, Split { aye, nay } }
const accountVote: ParameterTypeDef = {
  kind: 'enum',
  typeName: 'AccountVote',
  variants: [
    {
      name: 'Standard',
      index: 0,
      fields: [
        { name: 'vote', typeDef: { kind: 'primitive', typeName: 'u8', primitiveType: 'u8' } },
        { name: 'balance', typeDef: balance },
      ],
    },
    {
      name: 'Split',
      index: 1,
      fields: [
        { name: 'aye', typeDef: balance },
        { name: 'nay', typeDef: balance },
      ],
    },
  ],
};

describe('EnumParamInput', () => {
  it('shows the fields of a multi-field variant keyed by field name', () => {
    render(
      <EnumParamInput
        typeDef={accountVote}
        value={{ variant: 'Split', values: { aye: '1', nay: '0.5' } }}
        depth={0}
        api={null}
        onChange={vi.fn()}
      />,
    );

    expect(screen.getByText('aye: Balance (extrinsicBuilder.balanceHint)')).toBeInTheDocument();
    expect(screen.getByDisplayValue('1')).toBeInTheDocument();
    expect(screen.getByDisplayValue('0.5')).toBeInTheDocument();
  });
});
