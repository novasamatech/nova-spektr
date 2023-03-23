import { render, screen } from '@testing-library/react';
import { MemoryRouter, useNavigate } from 'react-router-dom';

import ButtonBack from './ButtonBack';

jest.mock('react-router-dom', () => ({
  useNavigate: jest.fn(),
}));

describe('ui/Buttons/ButtonBack', () => {
  afterEach(() => {
    jest.clearAllMocks();
  });

  test('should render component', () => {
    render(<ButtonBack>Back home</ButtonBack>, { wrapper: MemoryRouter });

    const children = screen.getByRole('button');
    expect(children).toBeInTheDocument();
  });

  test('should call inner navigate', () => {
    const spyNavigate = jest.fn();
    (useNavigate as jest.Mock).mockReturnValue(spyNavigate);

    render(<ButtonBack>Back home</ButtonBack>, { wrapper: MemoryRouter });

    const button = screen.getByRole('button');
    button.click();

    expect(spyNavigate).toBeCalled();
  });

  test('should call custom navigate', () => {
    const spyReturn = jest.fn();
    render(<ButtonBack onCustomReturn={spyReturn}>Back home</ButtonBack>, { wrapper: MemoryRouter });

    const button = screen.getByRole('button');
    button.click();

    expect(spyReturn).toBeCalled();
  });
});
