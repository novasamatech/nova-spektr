import { render } from '@testing-library/react';

import { createSlot } from './createSlot';

describe('createSlot', () => {
  it('should handle simple', () => {
    const slot = createSlot<{ data: number }>();

    slot.registerHandler({ fn: ({ data }) => <span data-testid="first">{data}</span> });
    slot.registerHandler({ fn: ({ data }) => <span data-testid="second">{data + 1}</span> });

    const nodes = slot.apply({ data: 1 });

    // eslint-disable-next-line react/jsx-no-useless-fragment
    const screen = render(<>{nodes}</>);

    expect(screen.container).toMatchInlineSnapshot(`
<div>
  <span
    data-testid="first"
  >
    1
  </span>
  <span
    data-testid="second"
  >
    2
  </span>
</div>
`);
  });
});
