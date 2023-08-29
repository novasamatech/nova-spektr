import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

import { ButtonText } from './ButtonText';
import { Button } from '@renderer/shared/ui';

describe('ui/Buttons/ButtonText', () => {
  test('should render component', () => {
    render(<Button pallet="primary">Hello button</Button>);

    const button = screen.getByRole('button', { name: 'Hello button' });
    expect(button).toBeInTheDocument();
  });

  test('should render prefix icon', () => {
    render(<ButtonText icon="polkadotvault">Hello button</ButtonText>);

    const prefix = screen.getByRole('img');
    expect(prefix).toBeInTheDocument();
  });

  test('should call onClick', async () => {
    const spyClick = jest.fn();
    render(<ButtonText onClick={spyClick}>Hello button</ButtonText>);

    await userEvent.click(screen.getByRole('button', { name: 'Hello button' }));

    expect(spyClick).toHaveBeenCalled();
  });
});
