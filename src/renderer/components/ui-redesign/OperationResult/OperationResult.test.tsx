import { render, screen } from '@testing-library/react';
import noop from 'lodash/noop';

import OperationResult from './OperationResult';

jest.mock('@renderer/components/ui-redesign/Animation/Animation', () => 'animation');

describe('ui/OperationResult', () => {
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
