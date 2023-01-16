import { act, render, screen } from '@testing-library/react';

import { Expandable } from '@renderer/components/common';

jest.mock('@headlessui/react', () => ({
  Transition: ({ show, children }: any) => {
    return show && children;
  },
}));

describe('components/common/Expandable', () => {
  test('should render component', () => {
    render(<Expandable item="test_item">children</Expandable>);

    const item = screen.getByText('test_item');
    const children = screen.getByText('children');
    expect(item).toBeInTheDocument();
    expect(children).toBeInTheDocument();
  });

  test('should toggle children', async () => {
    render(
      <Expandable defaultActive={false} item="test_item">
        children
      </Expandable>,
    );

    let children = screen.queryByText('children');
    expect(children).not.toBeInTheDocument();

    const button = screen.getByRole('button');
    await act(async () => button.click());

    children = screen.getByText('children');
    expect(children).toBeInTheDocument();
  });
});
