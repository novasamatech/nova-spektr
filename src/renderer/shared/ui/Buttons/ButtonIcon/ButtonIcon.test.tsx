import { render, screen } from '@testing-library/react';

import { ButtonIcon } from './ButtonIcon';

describe('ui/Buttons/ButtonIcon', () => {
  afterEach(() => {
    jest.clearAllMocks();
  });

  test('should render component', () => {
    render(<ButtonIcon icon="chat" />);

    const children = screen.getByTestId('chat-button');
    expect(children).toBeInTheDocument();
  });
});
