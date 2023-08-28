import { render, screen } from '@testing-library/react';

import { Button } from './Button';

describe('ui/Buttons/Button', () => {
  test('should render component', () => {
    render(<Button pallet="primary">Hello button</Button>);

    const button = screen.getByRole('button', { name: 'Hello button' });
    expect(button).toBeInTheDocument();
  });

  test('should render prefix icon', () => {
    render(
      <Button pallet="primary" icon="polkadotvault">
        Hello button
      </Button>,
    );

    const prefix = screen.getByRole('img');
    expect(prefix).toBeInTheDocument();
  });

  test('should render suffix', () => {
    render(
      <Button pallet="primary" suffixElement="Suffix">
        Hello button
      </Button>,
    );

    const suffix = screen.getByText('Suffix');
    expect(suffix).toBeInTheDocument();
  });

  test('should call onClick', () => {
    const spyClick = jest.fn();
    render(
      <Button pallet="primary" onClick={spyClick}>
        Hello button
      </Button>,
    );

    const button = screen.getByRole('button', { name: 'Hello button' });
    button.click();

    expect(spyClick).toBeCalledTimes(1);
  });
});
