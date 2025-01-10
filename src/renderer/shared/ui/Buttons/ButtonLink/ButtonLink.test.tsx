import { act, render, screen } from '@testing-library/react';
import { BrowserRouter, MemoryRouter } from 'react-router-dom';

import { ButtonLink } from './ButtonLink';

describe('ui/Buttons/ButtonLink', () => {
  test('should render component', () => {
    render(<ButtonLink to="test_page" />, { wrapper: MemoryRouter });

    const buttonLink = screen.getByRole('link');
    expect(buttonLink).toBeInTheDocument();
  });

  test('should navigate on click', () => {
    window.history.pushState({}, '', '/init_page');

    render(<ButtonLink to="test_page" />, { wrapper: BrowserRouter });

    expect(window.location.href).toEqual('http://localhost:3000/init_page');

    const buttonLink = screen.getByRole('link');
    act(() => buttonLink.click());

    expect(window.location.href).toEqual('http://localhost:3000/test_page');
  });

  test('should render disabled', () => {
    render(
      <ButtonLink to="test_page" disabled>
        Disabled
      </ButtonLink>,
      { wrapper: MemoryRouter },
    );

    const buttonLink = screen.queryByRole('link');
    expect(buttonLink).not.toBeInTheDocument();

    const disabledContainer = screen.getByText('Disabled');
    expect(disabledContainer).toBeInTheDocument();
  });

  test('should call callback on page transition', async () => {
    const spyCallback = jest.fn();
    render(<ButtonLink to="test_page" callback={spyCallback} />, {
      wrapper: MemoryRouter,
    });

    const buttonLink = screen.getByRole('link');
    await act(() => buttonLink.click());

    expect(spyCallback).toHaveBeenCalled();
  });
});
