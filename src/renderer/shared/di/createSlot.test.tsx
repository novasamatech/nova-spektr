import { render } from '@testing-library/react';

import { createSlot, isSlotIdentifier } from './createSlot';

describe('createSlot', () => {
  it('should check type', () => {
    expect(isSlotIdentifier(createSlot())).toBeTruthy();
    expect(isSlotIdentifier({})).toBeFalsy();
  });

  it('should handle simple render', () => {
    const slot = createSlot<{ data: number }>();

    slot.registerHandler({ body: ({ data }) => <span data-testid="1">{data}</span>, available: () => true });
    slot.registerHandler({ body: ({ data }) => <span data-testid="2">{data + 1}</span>, available: () => true });

    const nodes = slot.render({ data: 1 });

    // eslint-disable-next-line react/jsx-no-useless-fragment
    const screen = render(<>{nodes}</>);

    expect(screen.container).toMatchInlineSnapshot(`
<div>
  <span
    data-testid="1"
  >
    1
  </span>
  <span
    data-testid="2"
  >
    2
  </span>
</div>
`);
  });

  it('should handle ordering', () => {
    const slot = createSlot<{ data: number }>();

    slot.registerHandler({
      available: () => true,
      body: {
        render: ({ data }) => <span data-testid="1">{data}</span>,
        order: 1,
      },
    });
    slot.registerHandler({
      available: () => true,
      body: { render: ({ data }) => <span data-testid="2">{data + 1}</span> },
    });
    slot.registerHandler({
      available: () => true,
      body: {
        render: ({ data }) => <span data-testid="3">{data + 2}</span>,
        order: 0,
      },
    });

    const nodes = slot.render({ data: 1 });

    // eslint-disable-next-line react/jsx-no-useless-fragment
    const screen = render(<>{nodes}</>);

    expect(screen.container).toMatchInlineSnapshot(`
<div>
  <span
    data-testid="3"
  >
    3
  </span>
  <span
    data-testid="1"
  >
    1
  </span>
  <span
    data-testid="2"
  >
    2
  </span>
</div>
`);
  });
});
