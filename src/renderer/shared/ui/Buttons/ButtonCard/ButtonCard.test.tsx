import { render, screen } from '@testing-library/react';

import { ButtonCard } from './ButtonCard';

describe('ui/Buttons/ButtonCard', () => {
  test('should render component', () => {
    render(<ButtonCard icon="thumbUp">Hello button</ButtonCard>);

    const button = screen.getByRole('button');
    expect(button).toBeInTheDocument();
  });

  test('should call onClick', () => {
    const spyClick = jest.fn();
    render(
      <ButtonCard icon="thumbUp" onClick={spyClick}>
        Hello button
      </ButtonCard>,
    );

    const button = screen.getByRole('button');
    button.click();

    expect(spyClick).toBeCalledTimes(1);
  });
});
