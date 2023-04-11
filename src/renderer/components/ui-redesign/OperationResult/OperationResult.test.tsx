import { render, screen } from '@testing-library/react';

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
    render(
      <OperationResult title="success" isOpen onClose={() => undefined}>
        <button type="button">ok</button>
      </OperationResult>,
    );

    const button = screen.getByRole('button', { name: 'ok' });
    expect(button).toBeInTheDocument();
  });
});
