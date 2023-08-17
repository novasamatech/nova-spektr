import { render, screen } from '@testing-library/react';

import { Button } from './Button';

describe('ui/Buttons/Button', () => {
  test('should render component', () => {
    render(
      <Button variant="fill" pallet="primary">
        Hello button
      </Button>,
    );

    const button = screen.getByRole('button', { name: 'Hello button' });
    expect(button).toBeInTheDocument();
  });

  test('should render prefix', () => {
    render(
      <Button variant="fill" pallet="primary" prefixElement="Prefix">
        Hello button
      </Button>,
    );

    const prefix = screen.getByTestId('prefix');
    expect(prefix).toBeInTheDocument();
  });

  test('should render suffix', () => {
    render(
      <Button variant="fill" pallet="primary" suffixElement="Suffix">
        Hello button
      </Button>,
    );

    const suffix = screen.getByTestId('suffix');
    expect(suffix).toBeInTheDocument();
  });

  test('should call onClick', () => {
    const spyClick = jest.fn();
    render(
      <Button variant="fill" pallet="primary" onClick={spyClick}>
        Hello button
      </Button>,
    );

    const button = screen.getByRole('button', { name: 'Hello button' });
    button.click();

    expect(spyClick).toBeCalledTimes(1);
  });
});
