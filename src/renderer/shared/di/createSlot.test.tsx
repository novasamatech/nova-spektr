import { render } from '@testing-library/react';
import { Fragment } from 'react';

import { createSlot } from './createSlot';

describe('createSlot', () => {
  it('should handle simple', () => {
    const slot = createSlot<{ data: number }>();

    slot.registerHandler({ fn: ({ data }) => <span data-testid="first">{data}</span> });
    slot.registerHandler({ fn: ({ data }) => <span data-testid="second">{data + 1}</span> });

    const nodes = slot.apply({ data: 1 });

    // eslint-disable-next-line react/jsx-no-useless-fragment
    const screen = render(<Fragment>{nodes}</Fragment>);

    const first = screen.getByTestId('first');
    const second = screen.getByTestId('second');

    expect(first).toHaveTextContent('1');
    expect(second).toHaveTextContent('2');
  });
});
