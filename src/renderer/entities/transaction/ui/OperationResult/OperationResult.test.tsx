import { render, screen } from '@testing-library/react';
import noop from 'lodash/noop';

import { OperationResult } from './OperationResult';

jest.mock('@app/providers', () => ({
  useMatrix: jest.fn(),
}));

jest.mock('@shared/ui/Animation/Animation', () => ({
  Animation: () => <span>animation</span>,
}));

describe('components/common/OperationResult', () => {
  test('should render component', () => {
    render(
      <OperationResult isOpen title="success" onClose={noop}>
        children
      </OperationResult>,
    );

    const children = screen.getByText('children');
    expect(children).toBeInTheDocument();
  });
});
