import { render, screen } from '@testing-library/react';
import noop from 'lodash/noop';

import OperationResult from './OperationResult';

describe('ui/OperationResult', () => {
  test('should render component', () => {
    render(
      <OperationResult title="success" isOpen onClose={noop}>
        children
      </OperationResult>,
    );

    const children = screen.getByText('children');
    expect(children).toBeInTheDocument();
  });
});
